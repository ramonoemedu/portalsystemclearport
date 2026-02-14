'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Fab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Tooltip,
  CircularProgress,
  Switch,
  FormControlLabel,
  InputAdornment,
  Avatar,
  Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import PersonIcon from '@mui/icons-material/Person';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { db, auth } from '@/lib/firebase';
import { collection, addDoc, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { cn } from '@/lib/NextAdmin/utils';

type SystemUser = {
  id: string;
  fullName: string;
  username: string;
  userId: string;
  email?: string;
  status: 'active' | 'inactive';
  uid: string;
};

export default function UserManagementPage() {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<SystemUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    userId: '',
    email: '',
    password: '',
    status: true as boolean
  });
  const [showPassword, setShowPassword] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const usersSnapshot = await getDocs(collection(db, 'system_users'));
      const usersList = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SystemUser[];
      setUsers(usersList);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openAddDialog = () => {
    setEditUser(null);
    setFormData({
      fullName: '',
      username: '',
      userId: `USR-${Math.floor(1000 + Math.random() * 9000)}`,
      email: '',
      password: '',
      status: true
    });
    setDialogOpen(true);
  };

  const openEditDialog = (user: SystemUser) => {
    setEditUser(user);
    setFormData({
      fullName: user.fullName,
      username: user.username,
      userId: user.userId,
      email: user.email || '',
      password: '', // Password not shown for security
      status: user.status === 'active'
    });
    setDialogOpen(true);
  };

  const handleDialogSave = async () => {
    if (!formData.fullName || !formData.username || (!editUser && !formData.password)) {
      alert("Please fill in all required fields.");
      return;
    }

    setSaving(true);
    try {
      // Use a dummy email for Firebase Auth if no email provided
      const loginEmail = formData.email || `${formData.username}@clearport.local`;
      const status = formData.status ? 'active' : 'inactive';

      if (editUser) {
        // Update Firestore Metadata
        await updateDoc(doc(db, 'system_users', editUser.id), {
          fullName: formData.fullName,
          email: formData.email,
          status: status
        });
      } else {
        // 1. Create in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, loginEmail, formData.password);
        
        // 2. Set Display Name
        await updateProfile(userCredential.user, {
          displayName: formData.fullName
        });

        // 3. Create in Firestore system_users collection
        await addDoc(collection(db, 'system_users'), {
          fullName: formData.fullName,
          username: formData.username,
          userId: formData.userId,
          email: formData.email,
          loginEmail: loginEmail, // Store the email used for login
          status: status,
          uid: userCredential.user.uid,
          createdAt: new Date().toISOString()
        });
      }
      
      await fetchUsers();
      setDialogOpen(false);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-full space-y-6">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-heading-5 font-bold text-dark dark:text-white">
              User Management
            </h1>
            <p className="text-body-sm font-medium text-dark-5">
              Manage system users and access permissions
            </p>
          </div>
        </div>

        {/* User Table */}
        <div className="rounded-[10px] border border-stroke bg-white shadow-1 dark:border-dark-3 dark:bg-gray-dark overflow-hidden">
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow className="bg-gray-2 dark:bg-dark-2">
                  <TableCell className="font-bold text-dark dark:text-white">User</TableCell>
                  <TableCell className="font-bold text-dark dark:text-white">User ID</TableCell>
                  <TableCell className="font-bold text-dark dark:text-white">Username</TableCell>
                  <TableCell className="font-bold text-dark dark:text-white">Status</TableCell>
                  <TableCell align="right" className="font-bold text-dark dark:text-white">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" className="py-10">
                      <CircularProgress size={24} />
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" className="py-10 text-dark-5">
                      No users found in the system.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id} hover className="border-b border-stroke dark:border-dark-3 last:border-0">
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main' }}>
                            {user.fullName.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography className="font-bold text-dark dark:text-white">
                              {user.fullName}
                            </Typography>
                            <Typography variant="caption" className="text-dark-5">
                              {user.email || 'No email set'}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell className="text-dark dark:text-white font-medium">{user.userId}</TableCell>
                      <TableCell className="text-dark dark:text-white">{user.username}</TableCell>
                      <TableCell>
                        <Chip 
                          label={user.status.toUpperCase()} 
                          size="small"
                          className={cn(
                            "font-bold",
                            user.status === 'active' ? "bg-green/10 text-green" : "bg-red/10 text-red"
                          )}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit User">
                          <IconButton onClick={() => openEditDialog(user)} className="text-dark-5 hover:text-primary">
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </div>
      </div>

      <Fab
        color="primary"
        sx={{ 
          position: 'fixed', 
          bottom: 32, 
          right: 32, 
          bgcolor: '#006BFF',
          boxShadow: '0 10px 15px -3px rgba(0, 107, 255, 0.3)',
          '&:hover': { bgcolor: '#0052CC' }
        }}
        onClick={openAddDialog}
      >
        <AddIcon />
      </Fab>

      {/* Add/Edit Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => !saving && setDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: { borderRadius: '20px', p: 1 }
        }}
      >
        <DialogTitle className="font-bold text-xl px-6 pt-6">
          {editUser ? 'Edit System User' : 'Create New User'}
        </DialogTitle>
        <DialogContent className="px-6 space-y-4">
          <Typography variant="body2" color="text.secondary" mb={3}>
            {editUser ? 'Update user details and status.' : 'Assign a new username and ID for system access.'}
          </Typography>
          
          <div className="grid grid-cols-1 gap-4 pt-2">
            <TextField
              label="Full Name"
              required
              fullWidth
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="e.g. John Doe"
            />
            
            <div className="grid grid-cols-2 gap-4">
              <TextField
                label="Username"
                required
                disabled={!!editUser}
                fullWidth
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                placeholder="johndoe"
              />
              <TextField
                label="User ID"
                fullWidth
                value={formData.userId}
                onChange={(e) => setFormData({ ...formData, userId: e.target.value.toUpperCase().trim() })}
                placeholder="e.g. USR-1234"
              />
            </div>

            <TextField
              label="Email (Optional)"
              fullWidth
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="john@example.com"
            />

            {!editUser && (
              <TextField
                label="Login Password"
                required
                fullWidth
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            )}

            <FormControlLabel
              control={
                <Switch 
                  checked={formData.status} 
                  onChange={(e) => setFormData({ ...formData, status: e.target.checked })}
                  color="primary"
                />
              }
              label={
                <Typography variant="body2" className="font-bold">
                  {formData.status ? 'User is Active' : 'User is Inactive'}
                </Typography>
              }
            />
          </div>
        </DialogContent>
        <DialogActions className="px-6 pb-6">
          <Button onClick={() => setDialogOpen(false)} disabled={saving} className="text-dark-5 font-bold">
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleDialogSave} 
            disabled={saving}
            className="bg-primary font-bold px-8 py-2 rounded-xl shadow-lg shadow-primary/20"
          >
            {saving ? <CircularProgress size={20} color="inherit" /> : editUser ? 'Update User' : 'Create User'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}