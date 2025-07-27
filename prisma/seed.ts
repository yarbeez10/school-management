import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create a teacher
  const hashedTeacherPassword = await bcrypt.hash('teacher123', 12)
  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@example.com' },
    update: {},
    create: {
      email: 'teacher@example.com',
      password: hashedTeacherPassword,
      name: 'John Teacher',
      role: 'TEACHER'
    }
  })

  // Create students
  const hashedStudentPassword = await bcrypt.hash('student123', 12)
  const student1 = await prisma.user.upsert({
    where: { email: 'student1@example.com' },
    update: {},
    create: {
      email: 'student1@example.com',
      password: hashedStudentPassword,
      name: 'Alice Student',
      role: 'STUDENT'
    }
  })

  const student2 = await prisma.user.upsert({
    where: { email: 'student2@example.com' },
    update: {},
    create: {
      email: 'student2@example.com',
      password: hashedStudentPassword,
      name: 'Bob Student',
      role: 'STUDENT'
    }
  })

  // Create a subject
  const subject = await prisma.subject.upsert({
    where: { code: 'CS101' },
    update: {},
    create: {
      title: 'Introduction to Computer Science',
      description: 'Basic concepts of programming and computer science',
      code: 'CS101',
      teacherId: teacher.id
    }
  })

  // Enroll students in the subject
  await prisma.enrollment.upsert({
    where: {
      studentId_subjectId: {
        studentId: student1.id,
        subjectId: subject.id
      }
    },
    update: {},
    create: {
      studentId: student1.id,
      subjectId: subject.id
    }
  })

  await prisma.enrollment.upsert({
    where: {
      studentId_subjectId: {
        studentId: student2.id,
        subjectId: subject.id
      }
    },
    update: {},
    create: {
      studentId: student2.id,
      subjectId: subject.id
    }
  })

  // Create a task
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + 7) // Due in 7 days

  const task = await prisma.task.upsert({
    where: { id: 1 },
    update: {},
    create: {
      title: 'Programming Assignment 1',
      description: 'Create a simple calculator program using your preferred programming language. The calculator should support basic arithmetic operations (addition, subtraction, multiplication, division).\n\nRequirements:\n1. Handle user input\n2. Perform calculations\n3. Display results\n4. Handle division by zero\n\nSubmit your source code files and a brief documentation explaining your approach.',
      subjectId: subject.id,
      teacherId: teacher.id,
      dueDate: dueDate,
      maxPoints: 100
    }
  })

  // Create a sample submission
  await prisma.submission.upsert({
    where: {
      taskId_studentId: {
        taskId: task.id,
        studentId: student1.id
      }
    },
    update: {},
    create: {
      taskId: task.id,
      studentId: student1.id,
      content: 'I have implemented a calculator program in Python. The program uses a simple command-line interface and includes all the required functionality including error handling for division by zero.',
      status: 'SUBMITTED',
      submittedAt: new Date()
    }
  })

  console.log('✅ Database seeded successfully!')
  console.log('👤 Demo accounts:')
  console.log('   Teacher: teacher@example.com / teacher123')
  console.log('   Student 1: student1@example.com / student123')
  console.log('   Student 2: student2@example.com / student123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
