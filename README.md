# Devbench Manager

A comprehensive full-stack web application for managing remote virtual machines (devbenches). This application provides a modern React frontend with real-time updates and a robust Node.js backend that integrates with Google Cloud Firestore and SSH for VM provisioning.

## Features

- **User Authentication**: Simple JWT-based authentication system
- **Real-time Updates**: Live status updates using Firestore onSnapshot
- **VM Management**: Create and monitor virtual machines on remote servers
- **SSH Integration**: Automated VM provisioning via SSH commands
- **Responsive Design**: Modern UI built with React and Tailwind CSS
- **Error Handling**: Comprehensive error handling with user-friendly messages

## Technology Stack

### Frontend
- **React 18** with functional components and hooks
- **Tailwind CSS** for styling and responsive design
- **React Router** for client-side routing
- **Axios** for HTTP requests
- **Firebase SDK** for real-time database updates

### Backend
- **Node.js** with Express.js framework
- **JWT** for authentication
- **Firebase Admin SDK** for Firestore integration
- **ssh2-promise** for SSH connections
- **CORS** and security middleware

### Database
- **Google Cloud Firestore** for data persistence
- Real-time synchronization across clients

## Project Structure

```
devbench/
├── frontend/                 # React frontend application
│   ├── public/              # Static assets
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── Login.js
│   │   │   ├── Dashboard.js
│   │   │   ├── DevbenchCard.js
│   │   │   ├── CreateDevbenchForm.js
│   │   │   └── Notification.js
│   │   ├── App.js           # Main app component
│   │   ├── index.js         # Entry point
│   │   └── index.css        # Tailwind CSS styles
│   ├── package.json
│   └── tailwind.config.js
├── server.js                # Express server
├── package.json             # Backend dependencies
├── .env.example             # Environment variables template
└── README.md               # This file
```

## Installation and Setup

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Google Cloud Firestore project
- SSH access to Ubuntu server for VM provisioning

### 1. Install Dependencies

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Environment Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Configure your environment variables in `.env`:
```env
PORT=3001
JWT_SECRET=your-super-secret-jwt-key-change-in-production
FIREBASE_CONFIG={"type":"service_account","project_id":"your-project",...}
APP_ID=your-app-id
```

### 3. Firebase Setup

Configure Firebase by setting the global variables in your environment or in the HTML template:

```javascript
window.__firebase_config = {
  // Your Firebase configuration object
};
window.__app_id = "your-app-id";
```

### 4. SSH Configuration

The application is configured to connect to:
- **Host**: asf-tb.duckdns.org
- **Username**: asf
- **Password**: ASF
- **Script**: ./provision_vm.sh

Ensure the provision script is available on the remote server and executable.

## Development

### Start Development Server

```bash
# Start backend server (runs on port 3001)
npm run dev

# In another terminal, start frontend development server
cd frontend
npm start
```

The frontend will be available at `http://localhost:3000` and will proxy API requests to the backend at `http://localhost:3001`.

### Build for Production

```bash
# Build frontend for production
npm run build

# Start production server
npm start
```

## API Endpoints

### Authentication
- `POST /api/login` - User login with username
  - Body: `{ username: string }`
  - Response: `{ token: string }`

### Devbenches
- `GET /api/devbenches` - Get user's devbenches (requires auth)
  - Headers: `Authorization: Bearer <token>`
  - Response: Array of devbench objects

- `POST /api/devbenches/create` - Create new devbench (requires auth)
  - Headers: `Authorization: Bearer <token>`
  - Body: `{ devbenchName: string }`
  - Response: Created devbench object

## Database Schema

### Firestore Structure
```
artifacts/{appId}/
└── users/{username}/
    └── devbenches/{devbenchId}
        ├── name: string
        ├── status: "Creating" | "Active" | "Error"
        ├── userId: string
        ├── createdAt: timestamp
        ├── details: object
        └── completedAt?: timestamp
```

## Security Considerations

- JWT tokens expire after 24 hours
- SSH credentials should be secured in production
- Input validation on both client and server
- CORS configured for security
- Helmet middleware for additional security headers

## Deployment

### Production Deployment
1. Set up environment variables on your server
2. Configure Firebase credentials
3. Build the frontend: `npm run build`
4. Start the server: `npm start`
5. Configure reverse proxy (nginx) for SSL termination

### Environment Variables for Production
- Set a strong `JWT_SECRET`
- Configure proper `FIREBASE_CONFIG`
- Set appropriate `PORT` if needed
- Consider using environment-specific configurations

## Troubleshooting

### Common Issues

1. **Firebase Connection Issues**
   - Ensure `__firebase_config` and `__app_id` are properly set
   - Check Firebase project permissions
   - Verify service account credentials

2. **SSH Connection Failures**
   - Verify SSH host accessibility
   - Check credentials and permissions
   - Ensure provision script exists and is executable

3. **Real-time Updates Not Working**
   - Check Firebase configuration
   - Verify Firestore rules allow read/write
   - Check browser console for errors

### Logs
- Backend logs are output to console
- Check browser developer tools for frontend errors
- Monitor Firestore usage in Firebase console

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review logs for error details
3. Ensure all dependencies are properly installed
4. Verify environment configuration
