# How to Test the App

teacher1, teacher2, teacher3
student1, student2, student3
password123

System Architecture & Key Features
Role-Based Access Control (RBAC)
Teacher:

View only courses authored by the logged-in instructor.

Create new course offerings with metadata (name, duration, topics, price, max capacity, status).

Edit existing course metadata and lifecycle status (Open, Close, Cancel).

View detailed roster of enrolled students (name, email, enrollment timestamp).

Delete courses (strictly guarded by business logic).

Student:

Browse available course offerings (Cancel courses are hidden).

Search and filter catalog dynamically by course title, teacher name, or topics.

Single-click enrollment with duplicate protection and capacity caps.

Dedicated "My Enrollments" dashboard.
