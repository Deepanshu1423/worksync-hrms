# WorkSync HRMS

WorkSync HRMS is a production-ready Human Resource Management System built for a Solar Power Plant company.  
The system is focused on employee management, geo-based attendance, task/project management, hire/fire management, reports, and dashboard analytics.

> This project is not a solar plant monitoring or electricity billing system.  
> It only manages company employees and their internal work activities.

---

## Project Scope

WorkSync HRMS helps the company manage:

- Employee records
- Roles and access control
- Departments and designations
- Hire and termination workflow
- Geo attendance with photo proof
- Admin/HR attendance monitoring
- Manager team attendance view
- Internal project management
- Project members
- Task management
- Reports and analytics

---

## Tech Stack

### Backend

- Node.js
- Express.js
- TypeScript
- PostgreSQL
- Prisma ORM
- JWT Authentication
- Cloudinary for image/file upload
- Zod for validation
- Multer for file handling

### Future Frontend

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- Framer Motion
- Recharts

---


## Login page 
<img width="3192" height="1680" alt="image" src="https://github.com/user-attachments/assets/2b6b9bb0-a80b-4a34-b140-7c84b63c4144" />




## Project Structure

```txt
worksync-hrms/
│
├── apps/
│   ├── api/
│   │   ├── prisma/
│   │   ├── src/
│   │   │   ├── config/
│   │   │   ├── database/
│   │   │   ├── middleware/
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── attendance/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── departments/
│   │   │   │   ├── designations/
│   │   │   │   ├── employees/
│   │   │   │   ├── files/
│   │   │   │   ├── office-locations/
│   │   │   │   ├── projects/
│   │   │   │   └── roles/
│   │   │   ├── shared/
│   │   │   ├── app.ts
│   │   │   └── server.ts
│   │   └── package.json
│   │
│   └── web/
│
├── packages/
│   └── shared/
│
├── package.json
├── README.md
└── .gitignore
