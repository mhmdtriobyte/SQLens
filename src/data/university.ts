import { DatabasePreset } from '@/types';

export const universityDatabase: DatabasePreset = {
  id: 'university',
  name: 'University Database',
  description: 'Students, courses, professors, and enrollments',
  schema: {
    tables: [
      {
        name: 'students',
        columns: [
          { name: 'student_id', type: 'INTEGER', constraints: ['PRIMARY KEY'] },
          { name: 'name', type: 'TEXT', constraints: ['NOT NULL'] },
          { name: 'age', type: 'INTEGER', constraints: ['NOT NULL'] },
          { name: 'major', type: 'TEXT', constraints: ['NOT NULL'] },
          { name: 'gpa', type: 'REAL', constraints: ['NOT NULL'] },
          { name: 'enrollment_year', type: 'INTEGER', constraints: ['NOT NULL'] }
        ]
      },
      {
        name: 'professors',
        columns: [
          { name: 'professor_id', type: 'INTEGER', constraints: ['PRIMARY KEY'] },
          { name: 'name', type: 'TEXT', constraints: ['NOT NULL'] },
          { name: 'department', type: 'TEXT', constraints: ['NOT NULL'] },
          { name: 'tenure', type: 'INTEGER', constraints: ['NOT NULL'] }
        ]
      },
      {
        name: 'courses',
        columns: [
          { name: 'course_id', type: 'INTEGER', constraints: ['PRIMARY KEY'] },
          { name: 'title', type: 'TEXT', constraints: ['NOT NULL'] },
          { name: 'department', type: 'TEXT', constraints: ['NOT NULL'] },
          { name: 'credits', type: 'INTEGER', constraints: ['NOT NULL'] },
          { name: 'professor_id', type: 'INTEGER', constraints: ['REFERENCES professors(professor_id)'] }
        ]
      },
      {
        name: 'enrollments',
        columns: [
          { name: 'enrollment_id', type: 'INTEGER', constraints: ['PRIMARY KEY'] },
          { name: 'student_id', type: 'INTEGER', constraints: ['REFERENCES students(student_id)'] },
          { name: 'course_id', type: 'INTEGER', constraints: ['REFERENCES courses(course_id)'] },
          { name: 'grade', type: 'TEXT', constraints: [] },
          { name: 'semester', type: 'TEXT', constraints: ['NOT NULL'] }
        ]
      }
    ]
  },
  seedData: {
    students: [
      [1, 'Emma Johnson', 20, 'Computer Science', 3.8, 2022],
      [2, 'Liam Chen', 21, 'Computer Science', 3.5, 2021],
      [3, 'Olivia Martinez', 19, 'Mathematics', 3.9, 2023],
      [4, 'Noah Williams', 22, 'Physics', 3.2, 2020],
      [5, 'Ava Thompson', 20, 'Biology', 3.7, 2022],
      [6, 'Ethan Davis', 21, 'English', 3.4, 2021],
      [7, 'Sophia Brown', 23, 'History', 3.6, 2020],
      [8, 'Mason Garcia', 19, 'Computer Science', 3.1, 2023],
      [9, 'Isabella Wilson', 20, 'Mathematics', 4.0, 2022],
      [10, 'James Anderson', 22, 'Physics', 2.9, 2020],
      [11, 'Mia Taylor', 21, 'Biology', 3.5, 2021],
      [12, 'Benjamin Lee', 20, 'Computer Science', 3.3, 2022],
      [13, 'Charlotte Harris', 19, 'English', 3.8, 2023],
      [14, 'Lucas Clark', 24, 'History', 2.7, 2020],
      [15, 'Amelia Robinson', 21, 'Mathematics', 3.6, 2021],
      [16, 'Alexander White', 20, 'Physics', 3.4, 2022],
      [17, 'Harper Lewis', 22, 'Biology', 3.9, 2020],
      [18, 'Daniel Walker', 19, 'Computer Science', 2.8, 2024]
    ],
    professors: [
      [1, 'Dr. Sarah Mitchell', 'Computer Science', 1],
      [2, 'Dr. Robert Kim', 'Computer Science', 1],
      [3, 'Dr. Jennifer Adams', 'Mathematics', 1],
      [4, 'Dr. Michael Torres', 'Physics', 0],
      [5, 'Dr. Emily Parker', 'Biology', 1],
      [6, 'Dr. William Scott', 'English', 1],
      [7, 'Dr. Lisa Green', 'History', 0],
      [8, 'Dr. James Miller', 'Mathematics', 1]
    ],
    courses: [
      [1, 'Introduction to Computer Science', 'Computer Science', 3, 1],
      [2, 'Data Structures and Algorithms', 'Computer Science', 4, 1],
      [3, 'Database Systems', 'Computer Science', 3, 2],
      [4, 'Linear Algebra', 'Mathematics', 4, 3],
      [5, 'Calculus I', 'Mathematics', 4, 3],
      [6, 'Calculus II', 'Mathematics', 4, 8],
      [7, 'Classical Mechanics', 'Physics', 4, 4],
      [8, 'Quantum Physics', 'Physics', 3, 4],
      [9, 'Cell Biology', 'Biology', 3, 5],
      [10, 'Genetics', 'Biology', 4, 5],
      [11, 'American Literature', 'English', 3, 6],
      [12, 'World History', 'History', 3, 7]
    ],
    enrollments: [
      [1, 1, 1, 'A', 'Fall 2022'],
      [2, 1, 2, 'A', 'Spring 2023'],
      [3, 1, 4, 'B', 'Fall 2022'],
      [4, 2, 1, 'B', 'Fall 2021'],
      [5, 2, 2, 'B', 'Spring 2022'],
      [6, 2, 3, 'A', 'Fall 2022'],
      [7, 3, 4, 'A', 'Fall 2023'],
      [8, 3, 5, 'A', 'Fall 2023'],
      [9, 3, 6, 'A', 'Spring 2024'],
      [10, 4, 7, 'C', 'Fall 2020'],
      [11, 4, 8, 'B', 'Spring 2021'],
      [12, 4, 4, 'C', 'Fall 2020'],
      [13, 5, 9, 'A', 'Fall 2022'],
      [14, 5, 10, 'B', 'Spring 2023'],
      [15, 5, 5, 'B', 'Fall 2022'],
      [16, 6, 11, 'B', 'Fall 2021'],
      [17, 6, 12, 'A', 'Spring 2022'],
      [18, 7, 12, 'A', 'Fall 2020'],
      [19, 7, 11, 'B', 'Spring 2021'],
      [20, 8, 1, 'C', 'Fall 2023'],
      [21, 8, 4, 'B', 'Fall 2023'],
      [22, 9, 4, 'A', 'Fall 2022'],
      [23, 9, 5, 'A', 'Fall 2022'],
      [24, 9, 6, 'A', 'Spring 2023'],
      [25, 10, 7, 'D', 'Fall 2020'],
      [26, 10, 8, 'C', 'Spring 2021'],
      [27, 11, 9, 'B', 'Fall 2021'],
      [28, 11, 10, 'B', 'Spring 2022'],
      [29, 12, 1, 'B', 'Fall 2022'],
      [30, 12, 2, 'C', 'Spring 2023'],
      [31, 12, 3, 'B', 'Fall 2023'],
      [32, 13, 11, 'A', 'Fall 2023'],
      [33, 13, 12, 'A', 'Fall 2023'],
      [34, 14, 12, 'C', 'Fall 2020'],
      [35, 14, 11, 'D', 'Spring 2021'],
      [36, 15, 4, 'A', 'Fall 2021'],
      [37, 15, 5, 'B', 'Fall 2021'],
      [38, 15, 6, 'A', 'Spring 2022'],
      [39, 16, 7, 'B', 'Fall 2022'],
      [40, 16, 4, 'B', 'Fall 2022'],
      [41, 17, 9, 'A', 'Fall 2020'],
      [42, 17, 10, 'A', 'Spring 2021'],
      [43, 18, 1, 'C', 'Fall 2024'],
      [44, 1, 3, 'A', 'Fall 2023'],
      [45, 2, 4, 'B', 'Fall 2021']
    ]
  },
  exampleQueries: [
    // BASIC QUERIES (5)
    {
      category: 'Basic',
      title: 'All Students',
      description: 'Select all students from the database',
      sql: 'SELECT * FROM students;'
    },
    {
      category: 'Basic',
      title: 'CS Majors',
      description: 'Filter students by Computer Science major',
      sql: "SELECT name, gpa FROM students WHERE major = 'Computer Science';"
    },
    {
      category: 'Basic',
      title: 'High GPA Students',
      description: 'Find students with GPA above 3.5',
      sql: 'SELECT name, major, gpa FROM students WHERE gpa > 3.5 ORDER BY gpa DESC;'
    },
    {
      category: 'Basic',
      title: 'Recent Enrollees',
      description: 'Students enrolled in 2023 or later',
      sql: 'SELECT name, major, enrollment_year FROM students WHERE enrollment_year >= 2023;'
    },
    {
      category: 'Basic',
      title: 'Course List',
      description: 'List all courses with credits',
      sql: 'SELECT title, department, credits FROM courses ORDER BY department, title;'
    },

    // JOIN QUERIES (4)
    {
      category: 'Joins',
      title: 'Students with Courses',
      description: 'Join students with their enrolled courses',
      sql: `SELECT s.name AS student_name, c.title AS course_title, e.grade
FROM students s
JOIN enrollments e ON s.student_id = e.student_id
JOIN courses c ON e.course_id = c.course_id
ORDER BY s.name, c.title;`
    },
    {
      category: 'Joins',
      title: 'Courses with Professors',
      description: 'Show courses along with their professor names',
      sql: `SELECT c.title AS course, p.name AS professor, c.department
FROM courses c
JOIN professors p ON c.professor_id = p.professor_id
ORDER BY c.department, c.title;`
    },
    {
      category: 'Joins',
      title: 'Student Enrollment Details',
      description: 'Full enrollment information with all related data',
      sql: `SELECT s.name AS student, c.title AS course, p.name AS professor, e.grade, e.semester
FROM enrollments e
JOIN students s ON e.student_id = s.student_id
JOIN courses c ON e.course_id = c.course_id
JOIN professors p ON c.professor_id = p.professor_id
ORDER BY e.semester DESC, s.name;`
    },
    {
      category: 'Joins',
      title: 'Professor Course Load',
      description: 'Show professors with their assigned courses',
      sql: `SELECT p.name AS professor, p.department, COUNT(c.course_id) AS course_count
FROM professors p
LEFT JOIN courses c ON p.professor_id = c.professor_id
GROUP BY p.professor_id, p.name, p.department
ORDER BY course_count DESC;`
    },

    // AGGREGATION QUERIES (3)
    {
      category: 'Aggregation',
      title: 'Average GPA by Major',
      description: 'Calculate average GPA grouped by major',
      sql: `SELECT major, ROUND(AVG(gpa), 2) AS avg_gpa, COUNT(*) AS student_count
FROM students
GROUP BY major
ORDER BY avg_gpa DESC;`
    },
    {
      category: 'Aggregation',
      title: 'Enrollment Statistics',
      description: 'Count enrollments per semester',
      sql: `SELECT semester, COUNT(*) AS enrollment_count
FROM enrollments
GROUP BY semester
ORDER BY semester;`
    },
    {
      category: 'Aggregation',
      title: 'Grade Distribution',
      description: 'Count of each grade across all enrollments',
      sql: `SELECT grade, COUNT(*) AS count
FROM enrollments
WHERE grade IS NOT NULL
GROUP BY grade
ORDER BY grade;`
    },

    // SUBQUERY QUERIES (3)
    {
      category: 'Subqueries',
      title: 'Above Average GPA',
      description: 'Find students with GPA above the overall average',
      sql: `SELECT name, major, gpa
FROM students
WHERE gpa > (SELECT AVG(gpa) FROM students)
ORDER BY gpa DESC;`
    },
    {
      category: 'Subqueries',
      title: 'Students in Popular Courses',
      description: 'Students enrolled in courses with more than 5 enrollments',
      sql: `SELECT DISTINCT s.name, s.major
FROM students s
JOIN enrollments e ON s.student_id = e.student_id
WHERE e.course_id IN (
  SELECT course_id
  FROM enrollments
  GROUP BY course_id
  HAVING COUNT(*) > 5
)
ORDER BY s.name;`
    },
    {
      category: 'Subqueries',
      title: 'Top Performer per Major',
      description: 'Find the highest GPA student in each major',
      sql: `SELECT name, major, gpa
FROM students s1
WHERE gpa = (
  SELECT MAX(gpa)
  FROM students s2
  WHERE s2.major = s1.major
)
ORDER BY major;`
    },

    // ADVANCED QUERIES (2)
    {
      category: 'Advanced',
      title: 'Student Performance Summary',
      description: 'Complex join with aggregation showing student course performance',
      sql: `SELECT
  s.name,
  s.major,
  s.gpa AS current_gpa,
  COUNT(e.enrollment_id) AS courses_taken,
  SUM(CASE WHEN e.grade = 'A' THEN 1 ELSE 0 END) AS a_grades,
  SUM(CASE WHEN e.grade IN ('A', 'B') THEN 1 ELSE 0 END) AS passing_high
FROM students s
LEFT JOIN enrollments e ON s.student_id = e.student_id
GROUP BY s.student_id, s.name, s.major, s.gpa
ORDER BY courses_taken DESC, s.name;`
    },
    {
      category: 'Advanced',
      title: 'Department Analysis',
      description: 'Comprehensive department statistics with multiple metrics',
      sql: `SELECT
  c.department,
  COUNT(DISTINCT c.course_id) AS num_courses,
  COUNT(DISTINCT e.student_id) AS unique_students,
  COUNT(e.enrollment_id) AS total_enrollments,
  SUM(c.credits) AS total_credits_offered
FROM courses c
LEFT JOIN enrollments e ON c.course_id = e.course_id
GROUP BY c.department
ORDER BY total_enrollments DESC;`
    }
  ]
};
