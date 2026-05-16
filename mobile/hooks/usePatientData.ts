import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { Appointment, MedicalRecord, Prescription, LabResult, Radiology, NotificationItem } from '../types/api';

export function usePatientData() {
  const { user, refreshUserData } = useAuth();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [radiologyResults, setRadiologyResults] = useState<Radiology[]>([]);
  const [dbNotifications, setDbNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // Stable refs to avoid unnecessary re-creations of fetchData
  const refreshRef = useRef(refreshUserData);
  refreshRef.current = refreshUserData;

  const userId = user?._id || (user as any)?.id || null;
  const userRole = user?.role || null;

  const fetchData = useCallback(async () => {
    // Skip fetching for non-patient roles to avoid unnecessary API calls
    if (!userId || (userRole && userRole !== 'patient')) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setErrors([]);

    // Refresh user data to keep profile fresh (no-op on failure)
    refreshRef.current().catch(() => {});

    const [appRes, recRes, presRes, labRes, radRes, notifsRes] = await Promise.allSettled([
      api.get('/appointments'),
      api.get(`/records/patient/${userId}`),
      api.get(`/prescriptions/${userId}`),
      api.get('/labs'),
      api.get('/radiology'),
      api.get('/notifications'),
    ]);

    if (!isMounted.current) return;

    const failed: string[] = [];

    if (appRes.status === 'fulfilled') {
      const d = appRes.value.data;
      setAppointments(d.data || d.appointments || []);
    } else failed.push('المواعيد');

    if (recRes.status === 'fulfilled') {
      const d = recRes.value.data;
      setMedicalRecords(d.data || d.records || []);
    } else failed.push('السجلات الطبية');

    if (presRes.status === 'fulfilled') {
      const d = presRes.value.data;
      setPrescriptions(d.data || d.prescriptions || []);
    } else failed.push('الروشتات');

    if (labRes.status === 'fulfilled') {
      const d = labRes.value.data;
      setLabResults(d.data || d.results || []);
    } else failed.push('التحاليل');

    if (radRes.status === 'fulfilled') {
      const d = radRes.value.data;
      setRadiologyResults(d.data || d.results || []);
    } else failed.push('الأشعة');

    if (notifsRes.status === 'fulfilled') {
      const d = notifsRes.value.data;
      setDbNotifications(d.data || d.notifications || []);
    }
    // notifications failure is silent

    setErrors(failed);
    setIsLoading(false);
  }, [userId, userRole]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Re-fetch whenever the screen regains focus, but skip the very first
  // focus (the useEffect above already covers initial mount). This keeps
  // dashboards fresh when a user returns from creating a record without
  // making them pull-to-refresh.
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

  const upcomingAppointments = useMemo(() =>
    appointments.filter(a => ['Pending', 'Confirmed', 'In-Progress'].includes(a.status) && new Date(a.date) >= new Date(Date.now() - 86400000)),
  [appointments]);

  const profileWarnings = useMemo(() => {
    const w: string[] = [];
    if (!user?.bloodType || user.bloodType === 'unknown') w.push('فصيلة الدم');
    if (!user?.allergies?.length) w.push('الحساسيات');
    if (!user?.chronicDiseases?.length) w.push('الأمراض المزمنة');
    if (!user?.dateOfBirth) w.push('تاريخ الميلاد');
    return w;
  }, [user]);

  return {
    appointments,
    upcomingAppointments,
    medicalRecords,
    prescriptions,
    labResults,
    radiologyResults,
    dbNotifications,
    profileWarnings,
    isLoading,
    errors,
    refetch: fetchData,
  };
}
