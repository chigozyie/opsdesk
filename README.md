# BizDesk - Business Management SaaS

A comprehensive multi-tenant SaaS business management platform built with Next.js, TypeScript, and Supabase. BizDesk helps small businesses manage their daily operations including customer relationships, invoicing, expense tracking, task management, and financial reporting.

## 🚀 Features

- **Multi-Tenant Architecture**: Secure workspace isolation for multiple businesses
- **Customer Management**: Track client relationships and transaction history
- **Invoice Management**: Create, send, and track invoices with automated calculations
- **Expense Tracking**: Log and categorize business expenses with filtering
- **Task Management**: Coordinate work and track completion with team members
- **Financial Reporting**: View key metrics and business performance dashboards
- **Role-Based Access Control**: Admin, Member, and Viewer roles with granular permissions
- **Audit Trail**: Complete tracking of data changes and user actions

## 🛠️ Technology Stack

- **Frontend**: Next.js 14+ with App Router and TypeScript
- **Backend**: Next.js Server Actions with Zod validation
- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **Authentication**: Supabase Auth with SSR support
- **Styling**: Tailwind CSS with shadcn/ui components
- **Validation**: Zod schemas for type-safe data validation
- **Code Quality**: ESLint, Prettier, and TypeScript strict mode

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Git for version control

## 🚀 Getting Started

### 1. Clone and Install

```bash
git clone <repository-url>
cd bizdesk
npm install
```

### 2. Environment Setup

Copy the environment template and configure your variables:

```bash
cp .env.example .env.local
```

Update `.env.local` with your Supabase credentials:

```env
# Database Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Application Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_here

# Development Configuration
NODE_ENV=development
```

### 3. Development Server

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run type-check` - Run TypeScript type checking
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

## 🏗️ Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── globals.css        # Global styles and Tailwind CSS
│   ├── layout.tsx         # Root layout component
│   └── page.tsx           # Home page
├── components/            # Reusable UI components (to be created)
├── lib/                   # Utility functions and configurations (to be created)
├── types/                 # TypeScript type definitions (to be created)
└── hooks/                 # Custom React hooks (to be created)
```

## 🔧 Configuration Files

- `next.config.js` - Next.js configuration with typed routes
- `tsconfig.json` - TypeScript configuration with strict mode
- `tailwind.config.ts` - Tailwind CSS configuration with design system
- `.eslintrc.json` - ESLint rules for code quality
- `.prettierrc` - Prettier formatting rules
- `postcss.config.js` - PostCSS configuration for Tailwind

## 🎨 Design System

The project uses a comprehensive design system built with Tailwind CSS:

- **Colors**: Primary, secondary, muted, accent, and destructive color schemes
- **Typography**: Inter font family with consistent sizing
- **Spacing**: Consistent spacing scale using Tailwind utilities
- **Components**: shadcn/ui components for consistent UI patterns
- **Dark Mode**: Built-in dark mode support with CSS variables

## 🔒 Security Features

- **Row Level Security (RLS)**: Database-level tenant isolation
- **Input Validation**: Zod schemas for all user inputs
- **SQL Injection Prevention**: Parameterized queries and validation
- **Authentication**: Secure session management with Supabase Auth
- **Authorization**: Role-based access control with granular permissions

## 📊 Multi-Tenant Architecture

BizDesk implements workspace-based multi-tenancy:

- **URL Structure**: `/app/[workspaceSlug]/dashboard`
- **Data Isolation**: All business data scoped to workspace
- **User Roles**: Admin, Member, and Viewer with different permissions
- **Security**: Complete data isolation between workspaces

## 🧪 Testing Strategy

The project will implement comprehensive testing:

- **Unit Tests**: Specific examples and edge cases
- **Property-Based Tests**: Universal correctness properties
- **Integration Tests**: Component interactions and workflows
- **End-to-End Tests**: Complete user journeys

## 📈 Development Roadmap

The implementation follows a structured approach:

1. **Foundation** ✅ - Project setup and configuration
2. **Database** - Schema design and RLS policies
3. **Authentication** - User management and sessions
4. **Multi-Tenancy** - Workspace system and routing
5. **Core Features** - Customer, invoice, expense, and task management
6. **Reporting** - Dashboard and financial metrics
7. **Security** - Audit trails and access control
8. **Performance** - Optimization and scalability

## 🤝 Contributing

1. Follow the established code style (ESLint + Prettier)
2. Write comprehensive tests for new features
3. Update documentation for significant changes
4. Use conventional commit messages
5. Ensure all checks pass before submitting PRs

## 📄 License

This project is proprietary software. All rights reserved.

## 🆘 Support

For development questions or issues:

1. Check the existing documentation
2. Review the requirements and design documents in `.kiro/specs/`
3. Consult the implementation tasks in `tasks.md`
4. Create detailed issue reports with reproduction steps

---

**Built with ❤️ using Next.js, TypeScript, and Supabase**