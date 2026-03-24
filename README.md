# PharmaEasy - Pharmacy Management System

A comprehensive pharmacy management system built with Express.js and MongoDB, featuring inventory management, batch tracking with FIFO billing, location management, and real-time alerts.

## Features

- **Medicine Management**: Add, search, and manage medicine inventory with autocomplete
- **Batch Tracking**: Track medicine batches with expiry dates and location assignments
- **Smart Billing**: FIFO-based billing system that automatically deducts from oldest batches first
- **Location Management**: 100 pre-configured storage locations (S1-R1 to S20-R5) with occupancy tracking
- **Real-Time Alerts**: Automatic alerts for low stock, expiring medicines, and expired batches
- **User Authentication**: Secure JWT-based authentication with role-based access control
- **Dashboard**: Real-time inventory overview with stock levels and alerts
- **Billing History**: Complete transaction history with detailed bill information

## Tech Stack

**Backend:**
- Node.js with Express.js
- MongoDB with Mongoose ODM
- JWT for authentication
- bcrypt for password hashing
- Helmet for security headers
- Express Rate Limit for API protection

**Frontend:**
- HTML5, CSS3, JavaScript (ES6+)
- Responsive design
- RESTful API integration

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn package manager

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd PharmaEasy
```

### 2. Install Dependencies

```bash
cd backend
npm install
```

### 3. Environment Configuration

Create a `.env` file in the `backend` directory with the following variables:

```env
# Database
MONGODB_URI=mongodb://127.0.0.1:27017/pharmeasy

# Authentication
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long

# Server
PORT=5000
NODE_ENV=development

# Frontend (for CORS)
FRONTEND_URL=http://localhost:3000
```

**Important:** 
- Replace `JWT_SECRET` with a strong, random string (minimum 32 characters)
- For production, use MongoDB Atlas connection string for `MONGODB_URI`
- Never commit the `.env` file to version control

### 4. Start MongoDB

Ensure MongoDB is running locally:

```bash
# Windows
mongod

# macOS/Linux
sudo systemctl start mongod
```

### 5. Start the Server

```bash
cd backend
node server.js
```

The server will start on `http://localhost:5000` and automatically:
- Connect to MongoDB
- Initialize 100 storage locations (if not already present)
- Create database indexes for optimal performance

### 6. Access the Application

Open your browser and navigate to:
- **Application**: `http://localhost:5000`
- **API Health Check**: `http://localhost:5000/api/dashboard`

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGODB_URI` | Yes | - | MongoDB connection string |
| `JWT_SECRET` | Yes | - | Secret key for JWT token generation (min 32 chars) |
| `PORT` | No | 5000 | Server port number |
| `NODE_ENV` | No | development | Environment mode (development/production) |
| `FRONTEND_URL` | No | - | Frontend URL for CORS (production only) |

## API Documentation

### Authentication Endpoints

#### Sign Up
```http
POST /api/signup
Content-Type: application/json

{
  "email": "user@pharmacy.com",
  "password": "SecurePass123",
  "name": "John Doe",
  "role": "staff"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "userId": "...",
    "email": "user@pharmacy.com",
    "name": "John Doe",
    "role": "staff"
  }
}
```

#### Login
```http
POST /api/login
Content-Type: application/json

{
  "email": "user@pharmacy.com",
  "password": "SecurePass123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "userId": "...",
    "email": "user@pharmacy.com",
    "name": "John Doe",
    "role": "staff"
  }
}
```

**Rate Limiting:** 5 attempts per 15 minutes per IP address

### Medicine Endpoints

All medicine endpoints require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

#### Get All Medicines
```http
GET /api/medicines
```

#### Search Medicines (Autocomplete)
```http
GET /api/medicines/search?q=para
```

#### Get Single Medicine
```http
GET /api/medicines/:id
```

#### Add Medicine
```http
POST /api/medicines
Content-Type: application/json

{
  "name": "Paracetamol 500mg",
  "price": 50,
  "manufacturer": "PharmaCorp",
  "category": "Pain Relief",
  "minimumStock": 10
}
```

### Batch Endpoints

#### Get All Batches
```http
GET /api/batches
```

#### Get Batches by Medicine
```http
GET /api/batches?medicine=<medicine-id>
```

#### Create Batch
```http
POST /api/batches
Content-Type: application/json

{
  "medicine": "<medicine-id>",
  "quantity": 100,
  "expiryDate": "2025-12-31",
  "location": "S1-R1"
}
```

### Billing Endpoints

#### Generate Bill
```http
POST /api/generate-bill
Content-Type: application/json

{
  "items": [
    {
      "medicineName": "Paracetamol 500mg",
      "quantityRequired": 10
    }
  ],
  "customerName": "John Doe",
  "paymentMethod": "Cash"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bill generated successfully",
  "billNumber": "BILL-1234567890",
  "totalAmount": 500,
  "billId": "..."
}
```

#### Get All Bills
```http
GET /api/bills
```

### Alert Endpoints

#### Get All Alerts
```http
GET /api/alerts
```

**Response:**
```json
{
  "success": true,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "alerts": {
    "lowStock": [...],
    "expiringSoon": [...],
    "expired": [...]
  },
  "counts": {
    "lowStock": 5,
    "expiringSoon": 3,
    "expired": 2
  }
}
```

#### Check Alerts Manually
```http
POST /api/check-alerts
```

#### Get Dashboard Summary
```http
GET /api/dashboard
```

### Location Endpoints

#### Get All Locations
```http
GET /api/locations
```

#### Get Free Locations
```http
GET /api/locations?isOccupied=false
```

## Database Schema

### Medicine
```javascript
{
  name: String (required, unique, indexed),
  price: Number (required, positive),
  manufacturer: String,
  category: String,
  minimumStock: Number (default: 10),
  totalStock: Number (default: 0),
  createdAt: Date,
  updatedAt: Date
}
```

### Batch
```javascript
{
  medicine: ObjectId (ref: Medicine, required, indexed),
  batchNumber: String (required, unique),
  quantity: Number (required, positive),
  expiryDate: Date (required, indexed),
  location: String (required, indexed),
  createdAt: Date,
  updatedAt: Date
}
```

### Location
```javascript
{
  code: String (required, unique, indexed),
  isOccupied: Boolean (default: false, indexed),
  currentBatch: ObjectId (ref: Batch),
  medicineName: String,
  batchNumber: String,
  expiryDate: Date,
  quantity: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### Bill
```javascript
{
  billNumber: String (required, unique, indexed),
  customerName: String,
  items: [{
    medicineName: String,
    batchNumber: String,
    quantitySold: Number,
    price: Number
  }],
  totalAmount: Number (required),
  paymentMethod: String (default: "Cash"),
  createdAt: Date (indexed),
  updatedAt: Date
}
```

### User
```javascript
{
  email: String (required, unique, lowercase, indexed),
  password: String (required, hashed),
  name: String,
  role: String (enum: ['admin', 'staff'], default: 'staff'),
  createdAt: Date,
  updatedAt: Date
}
```

## Security Features

- **Password Hashing**: bcrypt with 10 salt rounds
- **JWT Authentication**: 24-hour token expiration
- **Rate Limiting**: 5 login attempts per 15 minutes per IP
- **Helmet**: Security headers for XSS, clickjacking protection
- **CORS**: Whitelist-based origin control
- **Input Validation**: Server-side validation for all inputs
- **MongoDB Injection Protection**: Mongoose parameterized queries

## Testing

### Manual Testing

A comprehensive manual testing guide is available at `tests/MANUAL_TESTING_GUIDE.md` covering:
- Authentication flow
- Medicine and batch management
- Billing operations
- Alert system
- Location management
- Error handling
- Responsive design

### API Testing with PowerShell

Test scripts are available at `tests/api-tests.ps1`:

```powershell
# Run all tests
cd tests
.\api-tests.ps1
```

## Project Structure

```
PharmaEasy/
├── backend/
│   ├── models/
│   │   ├── Medicine.js
│   │   ├── Batch.js
│   │   ├── Location.js
│   │   ├── Bill.js
│   │   └── User.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── medicineRoutes.js
│   │   ├── batchRoutes.js
│   │   ├── billingRoutes.js
│   │   ├── alertRoutes.js
│   │   └── locationRoutes.js
│   ├── middleware/
│   │   └── auth.js
│   ├── services/
│   │   └── autoHeal.js
│   ├── server.js
│   ├── package.json
│   └── .env
├── frontend/
│   └── public/
│       ├── index.html
│       ├── login.html
│       ├── dashboard.html
│       ├── add-medicine.html
│       ├── generate-bill.html
│       ├── billing-history.html
│       ├── alerts.html
│       ├── locations.html
│       ├── css/
│       └── js/
├── tests/
│   ├── api-tests.ps1
│   └── MANUAL_TESTING_GUIDE.md
├── README.md
└── DEPLOYMENT.md
```

## Common Issues and Solutions

### MongoDB Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution:** Ensure MongoDB is running. Start it with `mongod` command.

### JWT_SECRET Missing
```
ERROR: Missing required environment variables: JWT_SECRET
```
**Solution:** Create a `.env` file with `JWT_SECRET` variable (minimum 32 characters).

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::5000
```
**Solution:** Change the `PORT` in `.env` or stop the process using port 5000.

### CORS Errors
```
Access to fetch at 'http://localhost:5000/api/...' has been blocked by CORS policy
```
**Solution:** Add your frontend URL to `FRONTEND_URL` in `.env` or update `allowedOrigins` in `server.js`.

## Performance Optimization

The system includes several performance optimizations:

1. **Database Indexes**: Optimized queries with indexes on frequently searched fields
2. **Connection Pooling**: MongoDB connection pooling for efficient database access
3. **Rate Limiting**: Prevents API abuse and ensures fair resource usage
4. **FIFO Algorithm**: Efficient batch selection for billing operations
5. **Real-Time Alerts**: In-memory alert caching for fast dashboard loading

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.

## Support

For issues, questions, or contributions, please open an issue on the repository.

## Deployment

For production deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).
