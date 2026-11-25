import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Compatibility redirect for any legacy route still importing this component.
export default function AdminPinEntry() {
  const navigate = useNavigate();
  useEffect(() => { navigate('/admin', { replace: true }); }, [navigate]);
  return null;
}
