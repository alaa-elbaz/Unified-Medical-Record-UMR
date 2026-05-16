import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { Appointment, Patient, Prescription } from '../types/api';

export function useDoctorData() {
  const { user, refreshUserData } = useAuth();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [recentPatients, setRecentPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const fetchData = useCallback(async () => {
    // Skip fetching for non-doctor roles to avoid unnecessary API calls
    if (user?.role !== 'doctor') {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setErrors([]);

    // Refresh profile silently
    refreshUserData().catch(() => {});

    const [appRes, patRes, presRes, recentRes] = await Promise.allSettled([
      api.get('/appointments'),
      api.get('/patients/my-patients'),
      api.get('/prescriptions'),
      api.get('/records/doctor/my-patients'),
    ]);

    if (!isMounted.current) return;

    const failed: string[] = [];

    if (appRes.status === 'fulfilled') {
      const d = appRes.value.data;
      setAppointments(d.data || d.appointments || []);
    } else failed.push('المواعيد');

    if (patRes.status === 'fulfilled') {
      const d = patRes.value.data;
      setPatients(d.data || d.patients || []);
    } else failed.push('المرضى');

    if (presRes.status === 'fulfilled') {
      const d = presRes.value.data;
      setPrescriptions(d.data || d.prescriptions || []);
    } else failed.push('الروشتات');

    if (recentRes.status === 'fulfilled') {
      const d = recentRes.value.data;
      setRecentPatients(d.data || d.patients || []);
    }
    // recent patients failure is silent

    setErrors(failed);
    setIsLoading(false);
  }, [user?.role]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refetch on screen focus (skip the initial focus — useEffect above
  // already handles mount). Same pattern as usePatientData.
  const isInitialFocusRef = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isInitialFocusRef.current) {
        isInitialFocusRef.current = false;
        return;
      }
      fetchData();
    }, [fetchData])
  );

  const todayStr = new Date().toDateString();

  const todayAppointments = useMemo(
    () => appointments.filter(a => new Date(a.date).toDateString() === todayStr),
    [appointments, todayStr]
  );

  const pendingCount = useMemo(
    () => appointments.filter(a => a.status === 'Pending').length,
    [appointments]
  );

  const completedCount = useMemo(
    () => appointments.filter(a => a.status === 'Completed').length,
    [appointments]
  );

  return {
    appointments,
    patients,
    prescriptions,
    recentPatients,
    todayAppointments,
    pendingCount,
    completedCount,
    isLoading,
    errors,
    refetch: fetchData,
  };
}
