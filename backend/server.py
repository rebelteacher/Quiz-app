from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Request, Response, Depends
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import random
import json
from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType
import aiohttp

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'test_database')]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Get LLM key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# ===== Models =====
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    picture: Optional[str] = None
    role: str = "student"  # "teacher" or "student"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Question(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    question_text: str
    options: List[str]  # 4 options
    correct_answer: int  # index of correct answer (0-3)
    standard: str

class Test(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    teacher_id: str
    resource_description: str
    questions: List[Question]
    status: str = "draft"  # "draft" or "published"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Assignment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    test_id: str
    student_emails: List[str]  # List of student emails
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StudentAnswer(BaseModel):
    question_id: str
    selected_answer: int  # index selected by student

class Submission(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    test_id: str
    student_id: str
    answers: List[StudentAnswer]
    score: float
    standards_breakdown: Dict[str, Dict[str, Any]]  # {standard: {correct: int, total: int, percentage: float}}
    submitted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Request/Response Models
class GenerateTestRequest(BaseModel):
    title: str
    resource_description: str
    num_questions: int = 20
    standards: Optional[str] = None

class AssignTestRequest(BaseModel):
    test_id: str
    student_emails: List[str]

class SubmitTestRequest(BaseModel):
    test_id: str
    answers: List[StudentAnswer]

# ===== Basic Routes =====
@api_router.get("/")
async def root():
    return {"message": "Quiz Generator API"}

# ===== Auth Helpers =====
async def get_current_user(request: Request) -> Optional[User]:
    # Check cookie first, then Authorization header
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            session_token = auth_header.replace("Bearer ", "")
    
    if not session_token:
        return None
    
    # Find session
    session = await db.user_sessions.find_one({"session_token": session_token})
    if not session:
        return None
    
    # Handle expires_at - could be datetime or string
    expires_at = session['expires_at']
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    
    # Ensure timezone-aware comparison
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        return None
    
    # Find user
    user_doc = await db.users.find_one({"id": session["user_id"]}, {"_id": 0})
    if not user_doc:
        return None
    
    return User(**user_doc)

async def require_auth(request: Request) -> User:
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

async def require_teacher(request: Request) -> User:
    user = await require_auth(request)
    if user.role != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can perform this action")
    return user

# ===== Auth Routes =====
@api_router.get("/auth/me")
async def get_me(user: User = Depends(require_auth)):
    return user

@api_router.post("/auth/session")
async def create_session(request: Request, response: Response):
    # Get session_id from header
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing session ID")
    
    # Call Emergent Auth API
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            ) as resp:
                if resp.status != 200:
                    raise HTTPException(status_code=400, detail="Invalid session ID")
                data = await resp.json()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Auth service error: {str(e)}")
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": data["email"]}, {"_id": 0})
    if existing_user:
        user = User(**existing_user)
    else:
        # Create new user (default to student role)
        user = User(
            email=data["email"],
            name=data.get("name", data["email"]),
            picture=data.get("picture"),
            role="student"
        )
        await db.users.insert_one(user.model_dump())
    
    # Create session
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    user_session = UserSession(
        user_id=user.id,
        session_token=data["session_token"],
        expires_at=expires_at
    )
    await db.user_sessions.insert_one({
        "user_id": user_session.user_id,
        "session_token": user_session.session_token,
        "expires_at": user_session.expires_at.isoformat(),
        "created_at": user_session.created_at.isoformat()
    })
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=data["session_token"],
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7*24*60*60,
        path="/"
    )
    
    return user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response, user: User = Depends(require_auth)):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    response.delete_cookie("session_token", path="/")
    return {"message": "Logged out"}

@api_router.post("/auth/set-role")
async def set_role(role: str, user: User = Depends(require_auth)):
    """Allow users to set their role (teacher or student)"""
    if role not in ["teacher", "student"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    await db.users.update_one({"id": user.id}, {"$set": {"role": role}})
    user.role = role
    return user

# ===== Test Generation Route =====
@api_router.post("/tests/generate")
async def generate_test(
    request: Request,
    title: str = File(...),
    resource_description: str = File(...),
    num_questions: int = File(20),
    standards: Optional[str] = File(None),
    file: Optional[UploadFile] = File(None),
    teacher: User = Depends(require_teacher)
):
    try:
        # Initialize LLM chat
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"test-gen-{uuid.uuid4()}",
            system_message="You are an expert educational content creator. Generate high-quality multiple choice questions based on the provided resources."
        ).with_model("gemini", "gemini-2.0-flash")
        
        # Prepare prompt
        prompt = f"""Create {num_questions} multiple choice questions based on the following resource:

Resource Description: {resource_description}
{f'Standards to cover: {standards}' if standards else ''}

For each question:
1. Write a clear, appropriate-level question
2. Provide exactly 4 answer options
3. Indicate which option is correct (0-3)
4. Tag with the relevant standard

Return ONLY a valid JSON array with this exact structure:
[
  {{
    "question_text": "Question here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": 0,
    "standard": "Standard code (e.g., CCSS.Math.3.OA.A.1)"
  }}
]

Do not include any markdown formatting or explanatory text, just the JSON array."""
        
        # If file is uploaded, include it
        file_contents = None
        if file:
            # Save file temporarily
            temp_path = f"/tmp/{file.filename}"
            with open(temp_path, "wb") as f:
                content = await file.read()
                f.write(content)
            
            # Determine mime type
            mime_type = file.content_type or "application/octet-stream"
            if file.filename.endswith('.pdf'):
                mime_type = "application/pdf"
            elif file.filename.endswith('.txt'):
                mime_type = "text/plain"
            elif file.filename.endswith('.csv'):
                mime_type = "text/csv"
            
            file_contents = [FileContentWithMimeType(
                file_path=temp_path,
                mime_type=mime_type
            )]
        
        # Send message to LLM
        user_message = UserMessage(text=prompt, file_contents=file_contents if file_contents else None)
        response = await chat.send_message(user_message)
        
        # Parse response
        response_text = response.strip()
        # Remove markdown code blocks if present
        if response_text.startswith('```'):
            response_text = response_text.split('```')[1]
            if response_text.startswith('json'):
                response_text = response_text[4:]
        response_text = response_text.strip()
        
        questions_data = json.loads(response_text)
        
        # Create Question objects
        questions = [Question(**q) for q in questions_data]
        
        # Create test
        test = Test(
            title=title,
            teacher_id=teacher.id,
            resource_description=resource_description,
            questions=questions
        )
        
        # Save to DB
        test_dict = test.model_dump()
        test_dict['created_at'] = test_dict['created_at'].isoformat()
        await db.tests.insert_one(test_dict)
        
        return test
    
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse AI response: {str(e)}. Response: {response_text[:200]}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Test generation failed: {str(e)}")

# ===== Test Management Routes =====
@api_router.put("/tests/{test_id}/publish")
async def publish_test(test_id: str, teacher: User = Depends(require_teacher)):
    test = await db.tests.find_one({"id": test_id})
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    if test["teacher_id"] != teacher.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.tests.update_one({"id": test_id}, {"$set": {"status": "published"}})
    return {"message": "Test published"}

@api_router.delete("/tests/{test_id}/questions/{question_id}")
async def delete_question(test_id: str, question_id: str, teacher: User = Depends(require_teacher)):
    test = await db.tests.find_one({"id": test_id})
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    if test["teacher_id"] != teacher.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Remove question from array
    questions = [q for q in test["questions"] if q["id"] != question_id]
    await db.tests.update_one({"id": test_id}, {"$set": {"questions": questions}})
    return {"message": "Question deleted"}

@api_router.post("/tests/{test_id}/generate-more")
async def generate_more_questions(
    test_id: str,
    request: Request,
    num_questions: int = File(5),
    file: Optional[UploadFile] = File(None),
    teacher: User = Depends(require_teacher)
):
    test = await db.tests.find_one({"id": test_id}, {"_id": 0})
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    if test["teacher_id"] != teacher.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        # Initialize LLM chat
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"test-gen-more-{uuid.uuid4()}",
            system_message="You are an expert educational content creator. Generate high-quality multiple choice questions based on the provided resources."
        ).with_model("gemini", "gemini-2.0-flash")
        
        # Get existing standards
        existing_standards = list(set([q["standard"] for q in test["questions"]]))
        standards_text = ", ".join(existing_standards) if existing_standards else "relevant educational standards"
        
        # Prepare prompt
        prompt = f\"\"\"Create {num_questions} NEW multiple choice questions based on the following resource:

Resource Description: {test["resource_description"]}
Standards to cover: {standards_text}

IMPORTANT: Generate questions that are DIFFERENT from these existing topics that are already covered in the test.

For each question:
1. Write a clear, appropriate-level question
2. Provide exactly 4 answer options
3. Indicate which option is correct (0-3)
4. Tag with the relevant standard

Return ONLY a valid JSON array with this exact structure:
[
  {{
    "question_text": "Question here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": 0,
    "standard": "Standard code"
  }}
]

Do not include any markdown formatting or explanatory text, just the JSON array.\"\"\"
        
        # If file is uploaded, include it
        file_contents = None
        if file:
            temp_path = f"/tmp/{file.filename}"
            with open(temp_path, "wb") as f:
                content = await file.read()
                f.write(content)
            
            mime_type = file.content_type or "application/octet-stream"
            if file.filename.endswith('.pdf'):
                mime_type = "application/pdf"
            elif file.filename.endswith('.txt'):
                mime_type = "text/plain"
            elif file.filename.endswith('.csv'):
                mime_type = "text/csv"
            
            file_contents = [FileContentWithMimeType(
                file_path=temp_path,
                mime_type=mime_type
            )]
        
        # Send message to LLM
        user_message = UserMessage(text=prompt, file_contents=file_contents if file_contents else None)
        response = await chat.send_message(user_message)
        
        # Parse response
        response_text = response.strip()
        if response_text.startswith('```'):
            response_text = response_text.split('```')[1]
            if response_text.startswith('json'):
                response_text = response_text[4:]
        response_text = response_text.strip()
        
        new_questions_data = json.loads(response_text)
        new_questions = [Question(**q) for q in new_questions_data]
        
        # Add new questions to existing ones
        all_questions = test["questions"] + [q.model_dump() for q in new_questions]
        await db.tests.update_one({"id": test_id}, {"$set": {"questions": all_questions}})
        
        # Return updated test
        updated_test = await db.tests.find_one({"id": test_id}, {"_id": 0})
        return updated_test
        
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse AI response: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate more questions: {str(e)}")

@api_router.get("/tests")
async def get_tests(user: User = Depends(require_auth)):
    if user.role == "teacher":
        tests = await db.tests.find({"teacher_id": user.id}, {"_id": 0}).to_list(1000)
    else:
        # Get assigned tests for student
        assignments = await db.assignments.find({"student_emails": user.email}, {"_id": 0}).to_list(1000)
        test_ids = [a["test_id"] for a in assignments]
        tests = await db.tests.find({"id": {"$in": test_ids}}, {"_id": 0}).to_list(1000)
    
    return tests

@api_router.get("/tests/{test_id}")
async def get_test(test_id: str, user: User = Depends(require_auth)):
    test = await db.tests.find_one({"id": test_id}, {"_id": 0})
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    # Check permission
    if user.role == "teacher" and test["teacher_id"] != user.id:
        # Check if any assignment exists for this test
        assignment = await db.assignments.find_one({"test_id": test_id})
        if not assignment:
            raise HTTPException(status_code=403, detail="Not authorized")
    elif user.role == "student":
        # Check if student is assigned
        assignment = await db.assignments.find_one({"test_id": test_id, "student_emails": user.email})
        if not assignment:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    return test

# Get randomized test for student
@api_router.get("/tests/{test_id}/take")
async def get_test_for_taking(test_id: str, user: User = Depends(require_auth)):
    test = await db.tests.find_one({"id": test_id}, {"_id": 0})
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    # Check if student is assigned
    assignment = await db.assignments.find_one({"test_id": test_id, "student_emails": user.email})
    if not assignment:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Randomize questions and options
    questions = test["questions"]
    random.shuffle(questions)
    
    for question in questions:
        # Store correct answer before shuffling
        correct_text = question["options"][question["correct_answer"]]
        # Shuffle options
        random.shuffle(question["options"])
        # Update correct answer index
        question["correct_answer"] = question["options"].index(correct_text)
    
    test["questions"] = questions
    return test

@api_router.delete("/tests/{test_id}")
async def delete_test(test_id: str, teacher: User = Depends(require_teacher)):
    test = await db.tests.find_one({"id": test_id})
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    if test["teacher_id"] != teacher.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.tests.delete_one({"id": test_id})
    await db.assignments.delete_many({"test_id": test_id})
    return {"message": "Test deleted"}

# ===== Assignment Routes =====
@api_router.post("/assignments")
async def assign_test(req: AssignTestRequest, teacher: User = Depends(require_teacher)):
    # Verify test exists and belongs to teacher
    test = await db.tests.find_one({"id": req.test_id})
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    if test["teacher_id"] != teacher.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Create or update assignment
    existing = await db.assignments.find_one({"test_id": req.test_id})
    if existing:
        # Update student list
        await db.assignments.update_one(
            {"test_id": req.test_id},
            {"$set": {"student_emails": req.student_emails}}
        )
        existing["student_emails"] = req.student_emails
        return existing
    else:
        assignment = Assignment(
            test_id=req.test_id,
            student_emails=req.student_emails
        )
        assignment_dict = assignment.model_dump()
        assignment_dict['created_at'] = assignment_dict['created_at'].isoformat()
        await db.assignments.insert_one(assignment_dict)
        return assignment

@api_router.get("/assignments/{test_id}")
async def get_assignment(test_id: str, teacher: User = Depends(require_teacher)):
    assignment = await db.assignments.find_one({"test_id": test_id}, {"_id": 0})
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return assignment

# ===== Submission Routes =====
@api_router.post("/submissions")
async def submit_test(req: SubmitTestRequest, user: User = Depends(require_auth)):
    # Get test
    test = await db.tests.find_one({"id": req.test_id}, {"_id": 0})
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    # Check if already submitted
    existing = await db.submissions.find_one({"test_id": req.test_id, "student_id": user.id})
    if existing:
        raise HTTPException(status_code=400, detail="Test already submitted")
    
    # Calculate score and standards breakdown
    questions = {q["id"]: q for q in test["questions"]}
    correct_count = 0
    standards_stats = {}
    
    for answer in req.answers:
        question = questions.get(answer.question_id)
        if not question:
            continue
        
        standard = question["standard"]
        if standard not in standards_stats:
            standards_stats[standard] = {"correct": 0, "total": 0}
        
        standards_stats[standard]["total"] += 1
        if answer.selected_answer == question["correct_answer"]:
            correct_count += 1
            standards_stats[standard]["correct"] += 1
    
    # Calculate percentages
    for standard in standards_stats:
        stats = standards_stats[standard]
        stats["percentage"] = round((stats["correct"] / stats["total"]) * 100, 2) if stats["total"] > 0 else 0
    
    score = round((correct_count / len(test["questions"])) * 100, 2)
    
    # Create submission
    submission = Submission(
        test_id=req.test_id,
        student_id=user.id,
        answers=req.answers,
        score=score,
        standards_breakdown=standards_stats
    )
    
    submission_dict = submission.model_dump()
    submission_dict['submitted_at'] = submission_dict['submitted_at'].isoformat()
    await db.submissions.insert_one(submission_dict)
    
    return submission

@api_router.get("/submissions/test/{test_id}")
async def get_test_submissions(test_id: str, teacher: User = Depends(require_teacher)):
    # Verify test belongs to teacher
    test = await db.tests.find_one({"id": test_id})
    if not test or test["teacher_id"] != teacher.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    submissions = await db.submissions.find({"test_id": test_id}, {"_id": 0}).to_list(1000)
    
    # Enrich with student info
    for sub in submissions:
        student = await db.users.find_one({"id": sub["student_id"]}, {"_id": 0, "name": 1, "email": 1})
        if student:
            sub["student_name"] = student.get("name", "")
            sub["student_email"] = student.get("email", "")
    
    return submissions

@api_router.get("/submissions/student/{test_id}")
async def get_student_submission(test_id: str, user: User = Depends(require_auth)):
    submission = await db.submissions.find_one({"test_id": test_id, "student_id": user.id}, {"_id": 0})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    return submission

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()