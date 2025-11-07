import requests
import sys
import json
from datetime import datetime

# Test configuration
BASE_URL = "https://auto-quiz-gen-1.preview.emergentagent.com/api"
TEACHER_TOKEN = "test_teacher_session_1762484419289"
TEACHER_EMAIL = "teacher.1762484419289@example.com"
STUDENT_TOKEN = "test_student_session_1762484419335"
STUDENT_EMAIL = "student.1762484419335@example.com"

class TestRunner:
    def __init__(self):
        self.tests_run = 0
        self.tests_passed = 0
        self.test_id = None
        self.assignment_id = None

    def log(self, message, level="INFO"):
        print(f"[{level}] {message}")

    def test_api(self, name, method, endpoint, expected_status, token=None, data=None, files=None, is_form_data=False):
        """Run a single API test"""
        url = f"{BASE_URL}{endpoint}"
        headers = {}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'
        
        if not is_form_data and data:
            headers['Content-Type'] = 'application/json'

        self.tests_run += 1
        self.log(f"\n{'='*60}")
        self.log(f"Test #{self.tests_run}: {name}")
        self.log(f"Endpoint: {method} {endpoint}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                if is_form_data:
                    response = requests.post(url, headers=headers, data=data, files=files, timeout=60)
                else:
                    response = requests.post(url, headers=headers, json=data, timeout=60)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                self.log(f"Unsupported method: {method}", "ERROR")
                return False, {}

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                self.log(f"✅ PASSED - Status: {response.status_code}", "SUCCESS")
                try:
                    response_data = response.json()
                    self.log(f"Response: {json.dumps(response_data, indent=2)[:500]}")
                    return True, response_data
                except:
                    return True, {}
            else:
                self.log(f"❌ FAILED - Expected {expected_status}, got {response.status_code}", "ERROR")
                try:
                    error_detail = response.json()
                    self.log(f"Error: {json.dumps(error_detail, indent=2)}", "ERROR")
                except:
                    self.log(f"Response text: {response.text[:500]}", "ERROR")
                return False, {}

        except Exception as e:
            self.log(f"❌ FAILED - Exception: {str(e)}", "ERROR")
            return False, {}

    def run_all_tests(self):
        self.log("\n" + "="*60)
        self.log("STARTING BACKEND API TESTS")
        self.log("="*60)

        # Test 1: Auth - Get teacher profile
        success, teacher_data = self.test_api(
            "Get Teacher Profile",
            "GET",
            "/auth/me",
            200,
            token=TEACHER_TOKEN
        )
        if not success:
            self.log("❌ CRITICAL: Teacher auth failed. Stopping tests.", "ERROR")
            return self.print_summary()

        # Test 2: Auth - Get student profile
        success, student_data = self.test_api(
            "Get Student Profile",
            "GET",
            "/auth/me",
            200,
            token=STUDENT_TOKEN
        )
        if not success:
            self.log("❌ CRITICAL: Student auth failed. Stopping tests.", "ERROR")
            return self.print_summary()

        # Test 3: Set role (already set, but test endpoint)
        success, _ = self.test_api(
            "Set Teacher Role",
            "POST",
            "/auth/set-role?role=teacher",
            200,
            token=TEACHER_TOKEN
        )

        # Test 4: Generate test with text description (no file)
        self.log("\n🔍 Testing AI Test Generation (text only)...")
        form_data = {
            'title': 'Python Basics Test',
            'resource_description': 'Python programming fundamentals including variables, loops, conditionals, and functions',
            'num_questions': '5',
            'standards': 'CS.Programming.Python'
        }
        
        success, test_data = self.test_api(
            "Generate Test (Text Only)",
            "POST",
            "/tests/generate",
            200,
            token=TEACHER_TOKEN,
            data=form_data,
            is_form_data=True
        )
        
        if success and test_data and 'id' in test_data:
            self.test_id = test_data['id']
            self.log(f"✅ Test created with ID: {self.test_id}", "SUCCESS")
            self.log(f"Questions generated: {len(test_data.get('questions', []))}")
        else:
            self.log("❌ CRITICAL: Test generation failed. This is a core feature.", "ERROR")
            # Continue with other tests even if generation fails

        # Test 5: Get all tests (teacher)
        success, tests_data = self.test_api(
            "Get Teacher Tests",
            "GET",
            "/tests",
            200,
            token=TEACHER_TOKEN
        )
        
        if success:
            self.log(f"Teacher has {len(tests_data)} tests")

        # Test 6: Assign test to student
        if self.test_id:
            success, assignment_data = self.test_api(
                "Assign Test to Student",
                "POST",
                "/assignments",
                200,
                token=TEACHER_TOKEN,
                data={
                    "test_id": self.test_id,
                    "student_emails": [STUDENT_EMAIL]
                }
            )
            
            if success and assignment_data:
                self.assignment_id = assignment_data.get('id')
                self.log(f"✅ Test assigned to student", "SUCCESS")

        # Test 7: Get assignment details
        if self.test_id:
            success, _ = self.test_api(
                "Get Assignment Details",
                "GET",
                f"/assignments/{self.test_id}",
                200,
                token=TEACHER_TOKEN
            )

        # Test 8: Get student tests (should see assigned test)
        success, student_tests = self.test_api(
            "Get Student Tests",
            "GET",
            "/tests",
            200,
            token=STUDENT_TOKEN
        )
        
        if success:
            self.log(f"Student has {len(student_tests)} assigned tests")

        # Test 9: Get test for taking (randomized)
        if self.test_id:
            success, randomized_test = self.test_api(
                "Get Test for Taking (Randomized)",
                "GET",
                f"/tests/{self.test_id}/take",
                200,
                token=STUDENT_TOKEN
            )
            
            if success and randomized_test:
                self.log(f"✅ Test retrieved with {len(randomized_test.get('questions', []))} questions")

        # Test 10: Submit test answers
        if self.test_id and randomized_test and 'questions' in randomized_test:
            # Create answers (select first option for all questions)
            answers = [
                {
                    "question_id": q['id'],
                    "selected_answer": 0
                }
                for q in randomized_test['questions']
            ]
            
            success, submission_data = self.test_api(
                "Submit Test Answers",
                "POST",
                "/submissions",
                200,
                token=STUDENT_TOKEN,
                data={
                    "test_id": self.test_id,
                    "answers": answers
                }
            )
            
            if success and submission_data:
                self.log(f"✅ Test submitted. Score: {submission_data.get('score')}%", "SUCCESS")
                self.log(f"Standards breakdown: {json.dumps(submission_data.get('standards_breakdown', {}), indent=2)}")

        # Test 11: Get student submission
        if self.test_id:
            success, _ = self.test_api(
                "Get Student Submission",
                "GET",
                f"/submissions/student/{self.test_id}",
                200,
                token=STUDENT_TOKEN
            )

        # Test 12: Get test submissions (teacher view)
        if self.test_id:
            success, submissions = self.test_api(
                "Get Test Submissions (Teacher)",
                "GET",
                f"/submissions/test/{self.test_id}",
                200,
                token=TEACHER_TOKEN
            )
            
            if success:
                self.log(f"Teacher sees {len(submissions)} submissions")

        # Test 13: Test duplicate submission prevention
        if self.test_id and randomized_test and 'questions' in randomized_test:
            answers = [
                {
                    "question_id": q['id'],
                    "selected_answer": 1
                }
                for q in randomized_test['questions']
            ]
            
            success, _ = self.test_api(
                "Prevent Duplicate Submission",
                "POST",
                "/submissions",
                400,  # Should fail with 400
                token=STUDENT_TOKEN,
                data={
                    "test_id": self.test_id,
                    "answers": answers
                }
            )
            
            if success:
                self.log("✅ Duplicate submission correctly prevented", "SUCCESS")

        # Test 14: Delete test
        if self.test_id:
            success, _ = self.test_api(
                "Delete Test",
                "DELETE",
                f"/tests/{self.test_id}",
                200,
                token=TEACHER_TOKEN
            )

        # Test 15: Logout
        success, _ = self.test_api(
            "Logout Teacher",
            "POST",
            "/auth/logout",
            200,
            token=TEACHER_TOKEN
        )

        return self.print_summary()

    def print_summary(self):
        self.log("\n" + "="*60)
        self.log("TEST SUMMARY")
        self.log("="*60)
        self.log(f"Total Tests: {self.tests_run}")
        self.log(f"Passed: {self.tests_passed}")
        self.log(f"Failed: {self.tests_run - self.tests_passed}")
        self.log(f"Success Rate: {(self.tests_passed/self.tests_run*100):.2f}%")
        self.log("="*60)
        
        return 0 if self.tests_passed == self.tests_run else 1

if __name__ == "__main__":
    runner = TestRunner()
    sys.exit(runner.run_all_tests())
