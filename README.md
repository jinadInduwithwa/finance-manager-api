# Project Documentation

## Prerequisites
Ensure the following are installed on your system: Node.js (v16.0.0 or higher), MongoDB (local instance or cloud service like Atlas), npm or yarn (package manager).

## Installation Steps
1. Clone the Repository: `[git clone https://github.com/your-repo.git](https://github.com/SE1020-IT2070-OOP-DSA-25/project-jinadInduwithwa.git)` then `cd your-repo`.
2. Install Dependencies: `npm install`.
3. Set Up Environment Variables: Create a `.env` file in the root directory and add the following variables: `PORT=5000`, `MONGO_URI=your_mongodb_connection_string`, `JWT_SECRET=your_jwt_secret_key`, `NODE_ENV=development`.
4. Start the Application: `npm start`.

## API Endpoints

Base URL: http://localhost:<port>/api/v1/
### Authentication
| Method | Endpoint                      | Description                     |
|--------|-------------------------------|---------------------------------|
| POST   | `/signup`                     | User registration               |
| POST   | `/signin`                     | User login                      |
| POST   | `/signout`                    | User logout                     |
| PATCH  | `/send-verification-code`     | Send email verification code    |
| PATCH  | `/verify-verification-code`   | Verify user code                |
| PATCH  | `/send-forgot-password-code`  | Send password reset code        |
| PATCH  | `/verify-forgot-password-code`| Verify password reset code      |
| PATCH  | `/change-password`            | Update user password            |
| GET    | `/admin`                      | Admin authentication check      |

### User Management (Admin Only)
| Method | Endpoint          | Description               |
|--------|-------------------|---------------------------|
| GET    | `/users`          | List all users            |
| GET    | `/users/:id`      | Get user by ID            |
| PATCH  | `/user/:id`       | Update user details       |
| DELETE | `/user/:id`       | Delete user               |

### Transaction Management (Admin Only)
| Method | Endpoint          | Description               |
|--------|-------------------|---------------------------|
| GET    | `/transactions`   | List all transaction      |

### Category Management (Admin Only)
| Method | Endpoint                     | Description               | Access        |
|--------|------------------------------|---------------------------|---------------|
| POST   | `/category/create`           | Create a new category     | Admin Only    |
| GET    | `/category/`                 | List all categories       | User & Admin  |
| PATCH  | `/category/:categoryId`      | Update a category         | Admin Only    |
| DELETE | `/category/:categoryId`      | Delete a category         | Admin Only    |



### Dashborad (Admin Only)
| Method | Endpoint          | Description               |
|--------|-------------------|---------------------------|
| GET    | `/counts`         | count counts              |


### Transactions
| Method | Endpoint                | Description               |
|--------|-------------------------|---------------------------|
| POST   | `/transactions`         | Create transaction        |
| GET    | `/transactions/user`    | Get user transactions     |
| GET    | `/transactions`         | Get transaction details   |
| PATCH  | `/transactions/:id`     | Update transaction        |
| DELETE | `/transactions/:id`     | Delete transaction        |

### Budgets
| Method | Endpoint              | Description           |
|--------|-----------------------|-----------------------|
| POST   | `/budgets`            | Create budget         |
| GET    | `/budgets/all`        | List all budgets      |
| GET    | `/budgets/filter`     | Filter budgets        |
| PATCH  | `/budgets/:id`        | Update budget         |
| DELETE | `/budgets/:id`        | Delete budget         |

### Goals
| Method | Endpoint              | Description           |
|--------|-----------------------|-----------------------|
| POST   | `/goals`              | Create goal           |
| GET    | `/goals/user`         | Get user goals        |
| PATCH  | `/goals/:id`          | Update goal           |
| PATCH  | `/goals/:id/fund`     | Add funds to goal     |
| DELETE | `/goals/:id`          | Delete goal           |

### Reports
| Method | Endpoint              | Description                   |
|--------|-----------------------|-------------------------------|
| GET    | `/reports/trends`     | Financial trends report       |
| GET    | `/reports/filter`     | Filtered summary report       |
| GET    | `/reports/goal`       | Goal progress report          |

### Notifications
| Method | Endpoint              | Description               |
|--------|-----------------------|---------------------------|
| GET    | `/notifications`      | Fetch user notifications  |

## Running Tests
### Unit Tests
Run unit tests using: `npx jest`.

- **adminController.test.js:** `npx jest adminController.test.js`
- **budgetController.test.js:** `npx jest budgetController.test.js`
- **goalController.test.js:** `npx jest goalController.test.js`
- **settingController.test.js:** `npx jest settingController.test.js`
- **transactionController.test.js:** `npx jest transactionController.test.js`
- **authController.test.js:** `npx jest authController.test.js`
- **notificationController.test.js:** `npx jest notificationController.test.js`
- **settingController.test.js:** `npx jest settingController.test.js`

### Integration Tests
1. Create a `.env.test` file for the test environment with: `MONGO_URI=your_test_db_connection_string`, `JWT_SECRET=test_jwt_secret`, `NODE_ENV=test`.
2. Run tests: `npm run test:integration`.


