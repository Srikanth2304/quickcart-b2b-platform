# Role Management Implementation - QuickCart B2B

## Overview
This document describes the production-grade role handling implementation for the QuickCart B2B application.

## Architecture

### 1. RoleType Enum (`entity/RoleType.java`)
- Defines valid roles: `MANUFACTURER` and `RETAILER`
- Provides compile-time safety - invalid roles cannot be passed
- Single source of truth for role definitions

### 2. DataInitializer (`config/DataInitializer.java`)
- Implements `CommandLineRunner` to run at application startup
- Automatically creates roles from `RoleType` enum if they don't exist
- **Idempotent**: Safe to run on every restart, won't create duplicates
- Uses `roleRepository.existsByName()` to check before inserting

### 3. RegisterRequest DTO Update
- Changed `role` field from `String` to `RoleType` enum
- Added Jakarta validation annotations for all fields
- JSON deserialization automatically maps role strings to enum values

### 4. AuthService Update
- Converts `RoleType` to database role using `roleType.name()`
- Fetches the corresponding `Role` entity from database
- Roles are guaranteed to exist due to startup initialization

## How It Works

### Application Startup
```
1. Spring Boot starts
2. DataInitializer.run() executes
3. For each RoleType (MANUFACTURER, RETAILER):
   - Check if role exists in database
   - If not, create and save it
4. Log confirmation of roles initialized
```

### User Registration Flow
```
1. Client sends POST /auth/register with JSON:
   {
     "name": "John Doe",
     "email": "john@example.com",
     "password": "secret123",
     "role": "MANUFACTURER"  // or "RETAILER"
   }

2. Spring deserializes "MANUFACTURER" string to RoleType.MANUFACTURER enum

3. Validation (@Valid) ensures all fields are present and valid

4. AuthService receives RegisterRequest with RoleType enum

5. Convert enum to string: request.getRole().name() → "MANUFACTURER"

6. Fetch Role entity from database by name

7. Create User with the Role and save
```

## API Usage

### Register a New User

**Endpoint:** `POST /auth/register`

**Request Body:**
```json
{
  "name": "Jane Smith",
  "email": "jane@manufacturer.com",
  "password": "SecurePass123",
  "role": "MANUFACTURER"
}
```

**Valid Role Values:**
- `"MANUFACTURER"`
- `"RETAILER"`

**Response:**
```
200 OK
"User registered successfully"
```

**Error Cases:**
- Invalid role: Returns 400 Bad Request with JSON parse error
- Missing fields: Returns 400 Bad Request with validation errors
- Duplicate email: Returns 500 with "Email already exists"

### Login

**Endpoint:** `POST /auth/login`

**Request Body:**
```json
{
  "email": "jane@manufacturer.com",
  "password": "SecurePass123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## Benefits

### ✅ Compile-Time Safety
- Cannot pass invalid role values in code
- IDE auto-completion for role values
- Refactoring is safe (rename enum value updates all references)

### ✅ Database Consistency
- Roles are automatically created on startup
- Works across all environments (dev/test/prod)
- No manual SQL scripts needed
- Idempotent initialization

### ✅ Production Ready
- Proper validation with Jakarta Bean Validation
- Clean separation of concerns
- Follows Spring Boot best practices
- Uses Lombok for cleaner code

### ✅ Maintainability
- Adding new roles: Just add to RoleType enum
- Single source of truth
- Well-documented with Javadoc comments

## Database Schema

### roles table
```sql
CREATE TABLE roles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);
```

After startup, contains:
```
id | name
---|-------------
1  | MANUFACTURER
2  | RETAILER
```

### user_roles join table
```sql
CREATE TABLE user_roles (
    user_id BIGINT REFERENCES users(id),
    role_id BIGINT REFERENCES roles(id),
    PRIMARY KEY (user_id, role_id)
);
```

## Testing

### Verify Role Initialization
Check application logs on startup:
```
INFO  DataInitializer : Initializing roles...
INFO  DataInitializer : ✓ Created role: MANUFACTURER
INFO  DataInitializer : ✓ Created role: RETAILER
INFO  DataInitializer : Role initialization complete. Total roles: 2
```

### Test Registration with Invalid Role
```bash
curl -X POST http://localhost:8080/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password",
    "role": "INVALID_ROLE"
  }'
```
Expected: 400 Bad Request (JSON parse error)

### Test Registration with Valid Role
```bash
curl -X POST http://localhost:8080/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Manufacturer",
    "email": "manufacturer@example.com",
    "password": "password123",
    "role": "MANUFACTURER"
  }'
```
Expected: 200 OK - "User registered successfully"

## Files Modified

1. **Created:**
   - `entity/RoleType.java` - Role enum
   - `config/DataInitializer.java` - Startup role initialization

2. **Updated:**
   - `dto/RegisterRequest.java` - Changed role type from String to RoleType
   - `service/AuthService.java` - Updated to use RoleType enum
   - `controller/AuthController.java` - Added @Valid annotations
   - `repository/RoleRepository.java` - Added existsByName() method

## Future Enhancements

1. **Role-Based Access Control:**
   ```java
   @PreAuthorize("hasRole('MANUFACTURER')")
   public ResponseEntity<?> manufacturerOnlyEndpoint() { ... }
   ```

2. **Custom Exception Handling:**
   - Replace RuntimeExceptions with custom exceptions
   - Implement @ControllerAdvice for global error handling

3. **Audit Logging:**
   - Log role assignments and changes
   - Track who created/modified users

4. **Role Hierarchy:**
   - If needed, add role hierarchy (e.g., ADMIN > MANUFACTURER > RETAILER)

