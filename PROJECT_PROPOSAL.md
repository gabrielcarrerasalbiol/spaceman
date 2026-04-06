# SPACEMAN - SELF-STORAGE MANAGEMENT PLATFORM
## Project Proposal & Implementation Plan

---

## 1. EXECUTIVE SUMMARY

Spaceman is a comprehensive web-based management platform designed for self-storage facility operators. The system provides complete operational control over multiple storage locations, units, clients, and rental contracts through an intuitive dashboard interface with advanced visual floor-plan mapping capabilities.

### Key Benefits
- **Centralised Management**: Single platform to manage all storage facilities
- **Visual Operations**: Interactive floor-plan designer for space optimisation
- **Complete Lifecycle**: From lead generation through contract termination
- **Role-Based Access**: Granular permission system for different user types
- **Real-Time Status**: Live occupancy tracking and unit availability

---

## 2. FUNCTIONALITY OVERVIEW

### 2.1 Core Business Modules

#### **Locations Management**
- Multi-facility management with complete address details
- Geographic coordinate integration for mapping
- Opening hours configuration per location
- Interactive map view using Leaflet for facility overview
- Contact information management (email, phone)
- Location-specific unit and contract tracking
- Active/inactive status control

#### **Units & Inventory Management**
- Individual storage unit tracking per location
- Comprehensive unit attributes:
  - Size specifications (sq ft + dimensions)
  - Flexible pricing structure (weekly/monthly/sale rates)
  - Feature flags (24h drive-up, indoor, climate control)
  - Custom offer text and descriptions
- **Bulk Unit Generation**: Template-based unit creation
  - Declare quantities per size (e.g., "10 units of 36 sq ft")
  - Auto-numbering system (36Sq 1, 36Sq 2, etc.)
- Unit status lifecycle management:
  - Available → Reserved → Occupied → Maintenance → Inactive
- Real-time availability tracking

#### **Visual Area Designer (Floor-Plan Editor)**
- **Canvas-based drag-and-drop interface** using React-Konva
- Multi-area support per location (floors/zones)
- Unit placement with precise positioning (x, y coordinates)
- Transform capabilities: resize, rotate, reorder (z-index)
- Background image upload for facility layouts
- **Live status colour-coding**:
  - Green: Available
  - Amber: Reserved
  - Blue: Occupied
  - Red: Maintenance
  - Grey: Inactive
- Direct contract linking from visual map
- Layout persistence and version control

#### **Client Relationship Management**
- Comprehensive customer database
- Contact details management (email, phone)
- Billing address and email separation
- Company and individual account support
- Client status tracking:
  - Active (current customers)
  - Inactive (former customers)
  - Lead (prospective customers)
- Notes and communication history

#### **Contract Management**
- Complete rental agreement lifecycle
- Client-unit-location relationship management
- **Contract number auto-generation** (CTR-YYYYMMDD-XXXX format)
- Flexible billing configuration:
  - Weekly/monthly rate selection
  - Custom billing day assignment
  - Deposit amount tracking
  - Payment method recording
- Contract status workflow:
  - Draft → Pending Signature → Active → Terminated/Expired/Cancelled
- Start and end date management
- Digital signature tracking
- Contract notes and special terms

#### **WordPress Integration**
- Location data synchronisation
- Unit availability publishing
- Automated missing field detection and sync
- Contract data integration for public-facing site

### 2.2 Platform Features

#### **Authentication & Security**
- **NextAuth.js v5** credentials-based authentication
- JWT session management
- Secure password hashing with bcryptjs
- Session timeout and refresh

#### **Role-Based Access Control (RBAC)**
- JSON-based granular permission system
- Pre-configured roles:
  - **ADMIN**: Full system access
  - **USER**: View-only access with profile editing
- Custom role creation capability
- Per-feature permission guards
- API and UI-level protection

#### **Activity Logging & Audit Trail**
- Comprehensive user action tracking
- Significant event recording
- Compliance-ready audit logs

#### **System Configuration**
- **Site Settings**:
  - Customisable platform name
  - Logo upload
  - Site description
  - Primary brand colour configuration
- **User Preferences**:
  - Light/Dark/System theme selection
  - Persistent user preferences
- **Responsive Design**:
  - Mobile-optimised interface
  - Collapsible sidebar navigation
  - Touch-friendly controls

---

## 3. TECHNOLOGY STACK

### 3.1 Frontend Layer

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 14.2 | React framework with App Router |
| **React** | 18.3 | UI component library |
| **TypeScript** | 5.x | Type-safe development |
| **Tailwind CSS** | 3.4 | Utility-first styling |
| **Radix UI** | Latest | Accessible component primitives |
| **Lucide React** | Latest | Icon library |
| **React-Konva** | 18.2 | Canvas-based visual editor |
| **Konva** | 9.3 | 2D canvas rendering engine |
| **Leaflet** | 1.9 | Interactive maps |

### 3.2 Backend Layer

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js API Routes** | 14.2 | Serverless API endpoints |
| **NextAuth.js** | v5.0.0-beta.22 | Authentication framework |
| **Prisma** | 6.19.2 | Type-safe ORM |
| **PostgreSQL** | Latest | Relational database |

### 3.3 Development Tools

| Technology | Version | Purpose |
|------------|---------|---------|
| **ESLint** | 8.x | Code linting |
| **TypeScript** | 5.x | Static type checking |
| **ts-node** | 10.9 | TypeScript execution |
| **csv-parse** | 6.2 | Data import utilities |

### 3.4 Infrastructure Requirements

**Development Environment:**
- Node.js 18+ runtime
- PostgreSQL database (local or cloud)
- npm package manager
- Git version control

**Production Environment:**
- Vercel (recommended) or compatible Node.js hosting
- Managed PostgreSQL database (e.g., Neon, Supabase, AWS RDS)
- CDN for static assets
- SSL certificate
- Environment variable management

---

## 4. IMPLEMENTATION STAGES

### **Stage 1: Foundation Setup** (Week 1-2)
**Objective**: Establish project infrastructure and core architecture

**Deliverables:**
- [x] Next.js 14 project initialization with TypeScript
- [x] PostgreSQL database setup
- [x] Prisma ORM configuration and schema design
- [x] Tailwind CSS styling framework
- [x] Base UI component library (Button, Card, Input, etc.)
- [x] Development environment configuration
- [x] Git repository and version control setup

**Technical Tasks:**
- Database schema design (Users, Roles, Locations, Units, Clients, Contracts)
- Authentication system foundation (NextAuth.js v5)
- Middleware setup for route protection
- Basic layout and navigation structure
- Environment configuration management

---

### **Stage 2: Authentication & Authorization** (Week 3)
**Objective**: Implement secure user access control

**Deliverables:**
- [x] Credentials-based authentication system
- [x] JWT session management
- [x] Login/logout functionality
- [x] Role-based access control (RBAC) system
- [x] Permission checking middleware
- [x] Protected API routes
- [x] User profile management

**Technical Tasks:**
- NextAuth configuration with Prisma adapter
- Password hashing with bcryptjs
- Session management and token handling
- JSON permission system design
- API route protection guards
- UI permission components

---

### **Stage 3: Core Data Models** (Week 4-5)
**Objective**: Implement fundamental business entities

**Deliverables:**
- [x] Locations CRUD operations
- [x] Units CRUD operations
- [x] Clients CRUD operations
- [x] Bulk unit generation system
- [x] Data validation and error handling
- [x] Search and filtering capabilities

**Technical Tasks:**
- Prisma schema extensions
- API route handlers for each entity
- Server-side validation
- List/table views with pagination
- Detail/edit views
- Form handling and submission

---

### **Stage 4: Visual Area Designer** (Week 6-8)
**Objective**: Build canvas-based floor-plan editor

**Deliverables:**
- [x] Canvas rendering engine (React-Konva)
- [x] Drag-and-drop unit placement
- [x] Transformation tools (resize, rotate, reposition)
- [x] Background image upload
- [x] Multi-area support per location
- [x] Layout save/load functionality
- [x] Live status colour-coding

**Technical Tasks:**
- Konva stage setup and configuration
- Unit shape components (Rectangle, Text)
- Transformer controls for editing
- State management for canvas objects
- Backend API for area/placement persistence
- Image upload handling and validation
- Coordinate system and snapping

---

### **Stage 5: Contract Management** (Week 9-10)
**Objective**: Implement complete contract lifecycle

**Deliverables:**
- [x] Contract CRUD operations
- [x] Auto-generated contract numbering
- [x] Client-unit-location linking
- [x] Contract status workflow
- [x] Billing configuration
- [x] Contract-to-unit status integration

**Technical Tasks:**
- Contract form with client/unit selection
- Status transition logic
- Date range validation
- Rate calculation and display
- Deposit tracking
- Integration with unit availability

---

### **Stage 6: Advanced Features** (Week 11-12)
**Objective**: Add platform maturity features

**Deliverables:**
- [x] Activity logging system
- [x] Site settings configuration
- [x] Theme switching (light/dark)
- [x] Interactive location map (Leaflet)
- [x] CSV data import utilities
- [x] WordPress integration API

**Technical Tasks:**
- Activity log schema and API
- Settings context and persistence
- Theme provider and toggle
- Leaflet map component with markers
- CSV parsing and validation
- External API integration hooks

---

### **Stage 7: Polish & Optimization** (Week 13-14)
**Objective**: Production-ready refinement

**Deliverables:**
- [x] Responsive design testing
- [x] Performance optimization
- [x] Security audit
- [x] Error handling improvements
- [x] User experience enhancements
- [x] Documentation completion

**Technical Tasks:**
- Mobile responsiveness testing
- Database query optimization
- Bundle size analysis and optimization
- Security vulnerability scanning
- Loading states and error messages
- User feedback and iteration

---

### **Stage 8: Testing & Deployment** (Week 15-16)
**Objective**: Quality assurance and production launch

**Deliverables:**
- [ ] Comprehensive testing suite
- [ ] Production deployment configuration
- [ ] Backup and disaster recovery plan
- [ ] Monitoring and alerting setup
- [ ] User training materials
- [ ] Post-launch support plan

**Technical Tasks:**
- End-to-end testing with Playwright
- Unit testing for critical functions
- Load testing for API endpoints
- Production environment setup (Vercel)
- Database migration procedures
- CI/CD pipeline configuration
- Monitoring dashboard setup

---

## 5. PROJECT TIMELINE

### **Total Duration: 16 Weeks (4 Months)**

```
WEEK  1-2  │████████████████│ Foundation Setup
WEEK  3    │████████████████│ Authentication & Authorization
WEEK  4-5  │████████████████│ Core Data Models
WEEK  6-8  │████████████████│ Visual Area Designer
WEEK  9-10 │████████████████│ Contract Management
WEEK 11-12 │████████████████│ Advanced Features
WEEK 13-14 │████████████████│ Polish & Optimization
WEEK 15-16 │████████████████│ Testing & Deployment
```

### **Key Milestones**

| Milestone | Week | Deliverable |
|-----------|------|-------------|
| **M1: Project Kickoff** | 1 | Infrastructure ready, team onboarded |
| **M2: Core Foundation** | 3 | Authentication complete, base UI ready |
| **M3: Data Layer** | 5 | All CRUD operations functional |
| **M4: Visual Editor** | 8 | Floor-plan designer fully operational |
| **M5: Business Logic** | 10 | Contract lifecycle complete |
| **M6: Feature Complete** | 12 | All planned features implemented |
| **M7: Production Ready** | 14 | Performance and security optimized |
| **M8: Launch** | 16 | Deployment complete, live in production |

### **Resource Allocation**

**Development Team:**
- 1 Senior Full-Stack Developer (Lead)
- 1 Frontend Developer (UI/Canvas specialist)
- 1 Backend Developer (API/Database specialist)

**Recommended Allocation:**
- 60% Development
- 20% Testing & Review
- 10% Documentation
- 10% Planning & Communication

---

## 6. RISK MANAGEMENT

### **Technical Risks**

| Risk | Impact | Probability | Mitigation Strategy |
|------|--------|-------------|---------------------|
| Canvas performance issues with large facilities | High | Medium | Implement virtualisation, lazy loading, object pooling |
| Complex permission logic bugs | High | Low | Comprehensive testing, permission audit tool |
| Database migration failures | Critical | Low | Automated migrations, backup procedures, staging environment |
| Third-party dependency vulnerabilities | Medium | Medium | Regular dependency audits, security scanning |

### **Project Risks**

| Risk | Impact | Probability | Mitigation Strategy |
|------|--------|-------------|---------------------|
| Scope creep during development | High | High | Strict change management process, milestone gating |
| Insufficient testing coverage | High | Medium | Mandatory code review, automated testing requirements |
| Performance bottlenecks in production | High | Medium | Load testing, performance monitoring, optimization sprints |

---

## 7. POST-LAUNCH CONSIDERATIONS

### **Phase 2 Enhancements** (Future Roadmap)
- Automated billing and invoicing system
- Payment gateway integration (Stripe/PayPal)
- Email notification system (contract renewals, payments)
- Advanced reporting and analytics dashboard
- Mobile native applications (iOS/Android)
- Client self-service portal
- Document management (contracts, insurance)
- API integrations (accounting software, access control systems)

### **Maintenance & Support**
- Regular security updates and dependency management
- Performance monitoring and optimization
- User feedback collection and iteration
- Bug fixes and patch releases
- Feature enhancements based on usage patterns

### **Scalability Planning**
- Database indexing optimisation
- CDN configuration for static assets
- Database read-replica setup for high-traffic scenarios
- Caching layer implementation (Redis)
- Load balancing for multi-instance deployment

---

## 8. CONCLUSION

Spaceman represents a comprehensive solution for self-storage facility management, combining modern web technologies with intuitive visual design tools. The 16-week implementation plan provides a structured path from foundation to production deployment, with clear milestones and deliverables.

The platform's modular architecture ensures maintainability and scalability, while the focus on user experience and visual operations sets it apart from traditional management systems. With proper execution of this proposal, stakeholders will have a powerful tool that streamlines operations, improves visibility, and enhances customer service capabilities.

---

**Document Version:** 1.0
**Last Updated:** April 2026
**Project Status:** Ready for Implementation
