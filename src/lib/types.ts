export interface User {
  id: number
  email: string
  name: string
  role: 'TEACHER' | 'STUDENT'
}

export interface AuthPayload {
  user: User
}

export interface LoginCredentials {
  email: string
  password: string
}
