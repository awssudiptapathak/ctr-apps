import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, AppState, Image, ImageBackground, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { isValidPhoneNumber, isValidFlatNumber, checkNominationEligibility } from '@ctr-cms/shared';
import { api, setAuthToken } from './src/api';
import type { FeedEvent, FeedProgram, FeedSchedule, GalleryImage, AppNotification, AuthUser, Nomination } from './src/types';

type Screen = 'login' | 'otp' | 'signup' | 'home';

const eventThumbnails = [
  require('./assets/hero-festival.jpg'),
  require('./assets/puja-preparation.jpg'),
  require('./assets/dhak-drums.jpg'),
  require('./assets/celebrations.jpg'),
];

export default function App() {
  const [screen, setScreen] = useState<Screen>('login');
  const [phone, setPhone] = useState('+919883614680');
  const [loginEmail, setLoginEmail] = useState('sudip241281@gmail.com');
  const [password, setPassword] = useState('Admin@123');
  const [otp, setOtp] = useState('123456');
  const [newPassword, setNewPassword] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpPurpose, setOtpPurpose] = useState<'password_reset' | 'verify_phone'>('password_reset');
  const [signupStep, setSignupStep] = useState<'details' | 'otp'>('details');
  const [fullName, setFullName] = useState('Aarav Sharma');
  const [flatNo, setFlatNo] = useState('B-204');
  const [email, setEmail] = useState('aarav@clubtown.com');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [programs, setPrograms] = useState<FeedProgram[]>([]);
  const [livePrograms, setLivePrograms] = useState<FeedProgram[]>([]);
  const [todaySchedule, setTodaySchedule] = useState<FeedSchedule[]>([]);
  const [upcomingPrograms, setUpcomingPrograms] = useState<FeedProgram[]>([]);
  const [openPrograms, setOpenPrograms] = useState<FeedProgram[]>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [selectedGalleryIndex, setSelectedGalleryIndex] = useState<number | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [nominations, setNominations] = useState<Nomination[]>([]);
  const [nominateTarget, setNominateTarget] = useState<FeedProgram | null>(null);
  const [participantName, setParticipantName] = useState('');
  const [participantPhone, setParticipantPhone] = useState('');
  const [participantFlatNo, setParticipantFlatNo] = useState('');
  const [participantAge, setParticipantAge] = useState('');
  const [performanceMode, setPerformanceMode] = useState<'SOLO' | 'GROUP'>('SOLO');
  const [performanceType, setPerformanceType] = useState('DANCE');
  const [probableTimeMinutes, setProbableTimeMinutes] = useState('');
  const [performanceSummary, setPerformanceSummary] = useState('');
  const [photoData, setPhotoData] = useState<string | null>(null);

  const isPhoneValid = useMemo(() => isValidPhoneNumber(phone), [phone]);

  const activeNominationCount = useMemo(
    () => nominations.filter((n) => ['PENDING', 'APPROVED', 'WAITLISTED', 'SLOT_ALLOCATED', 'COMPLETED'].includes(n.status)).length,
    [nominations],
  );

  const loadHome = useCallback(() => {
    setLoading(true);
    const feedPromise = api.get<{ events: FeedEvent[]; programs: FeedProgram[]; livePrograms: FeedProgram[]; todaySchedule: FeedSchedule[]; upcomingPrograms: FeedProgram[]; openPrograms: FeedProgram[] }>('/feed');
    const nominationPromise = api.get<{ nominations: Nomination[] }>('/nominations');
    const notificationPromise = api.get<{ notifications: AppNotification[] }>('/notifications');
    const galleryPromise = api.get<{ images: GalleryImage[] }>('/gallery');
    Promise.all([feedPromise, nominationPromise, notificationPromise, galleryPromise])
      .then(([feed, nom, inbox, gallery]) => {
        setEvents(feed.events);
        setPrograms(feed.programs);
        setLivePrograms(feed.livePrograms || []);
        setTodaySchedule(feed.todaySchedule || []);
        setUpcomingPrograms(feed.upcomingPrograms || []);
        setOpenPrograms(feed.openPrograms || []);
        setNominations(nom.nominations);
        setNotifications(inbox.notifications || []);
        setGalleryImages(gallery.images || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (screen !== 'home') return;
    loadHome();

    const refreshTimer = setInterval(loadHome, 30000);
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        loadHome();
      }
    });

    return () => {
      clearInterval(refreshTimer);
      appStateSubscription.remove();
    };
  }, [screen, loadHome]);

  const handleLogin = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    if (!password.trim()) {
      setError('Password is required.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const data = await api.post<{ token: string; user: AuthUser }>('/auth/login', { email: loginEmail, password });
      setAuthToken(data.token);
      setUser(data.user);
      setScreen('home');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!isPhoneValid) {
      setError('Enter an Indian mobile number in +91XXXXXXXXXX format.');
      return;
    }
    setError('');
    setLoading(true);
    setOtpVerified(false);
    setDevOtp('');
    setNewPassword('');
    setOtpPurpose('password_reset');
    try {
      const data = await api.post<{ ok: boolean; expiresIn: number; devOtp?: string }>('/auth/otp/request', {
        phone,
        purpose: 'password_reset',
      });
      if (data.devOtp) setDevOtp(data.devOtp);
      setOtp('');
      setScreen('otp');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.trim().length !== 6) {
      setError('Enter the 6-digit OTP code.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.post<{ ok: boolean }>('/auth/otp/verify', { phone, purpose: otpPurpose, code: otp });

      if (otpPurpose === 'password_reset') {
        setOtpVerified(true);
        return;
      }

      const data = await api.post<{ token: string; user: AuthUser }>('/auth/register', {
        fullName,
        phone,
        email,
        flatNo,
        password,
      });
      setAuthToken(data.token);
      setUser(data.user);
      setSignupStep('details');
      setScreen('home');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.trim().length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.post<{ ok: boolean }>('/auth/password-reset', {
        phone,
        code: otp,
        newPassword,
      });
      setScreen('login');
      setNewPassword('');
      setOtpVerified(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!fullName.trim() || !flatNo.trim()) {
      setError('Name and flat number are required.');
      return;
    }
    if (!isPhoneValid) {
      setError('Enter an Indian mobile number in +91XXXXXXXXXX format.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('A valid email is required to verify your account.');
      return;
    }
    if (!isValidFlatNumber(flatNo)) {
      setError('Flat must use the format 1A/B1 through 6L/B6.');
      return;
    }
    if (!password.trim() || password.trim().length < 8) {
      setError('Create a password with at least 8 characters.');
      return;
    }

    setError('');
    setLoading(true);
    setOtpVerified(false);
    setDevOtp('');
    setOtp('');
    setNewPassword('');
    setOtpPurpose('verify_phone');
    try {
      const data = await api.post<{ ok: boolean; expiresIn: number; devOtp?: string }>('/auth/otp/request', {
        phone,
        purpose: 'verify_phone',
        email,
      });
      if (data.devOtp) setDevOtp(data.devOtp);
      setSignupStep('otp');
      setScreen('otp');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setAuthToken(null);
    setUser(null);
    setError('');
    setNominations([]);
    setNotifications([]);
    setNominateTarget(null);
    setParticipantName('');
    setScreen('login');
  };

  const markNotificationRead = async (notification: AppNotification) => {
    if (notification.readAt) return;
    try {
      await api.put(`/notifications/${notification.id}/read`);
      setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item));
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleCloseNominate = () => {
    setNominateTarget(null);
    setParticipantName('');
    setParticipantPhone('');
    setParticipantFlatNo('');
    setParticipantAge('');
    setProbableTimeMinutes('');
    setPerformanceSummary('');
    setPhotoData(null);
    setError('');
  };

  const handleNominate = async () => {
    if (!nominateTarget) return;
    const age = Number(participantAge);
    const minutes = Number(probableTimeMinutes);
    if (!participantName.trim() || !Number.isInteger(age) || age < 1 || age > 120) {
      setError('Enter a valid participant name and age.');
      return;
    }
    if (!isValidPhoneNumber(participantPhone)) {
      setError('Enter an Indian mobile number in +91XXXXXXXXXX format.');
      return;
    }
    if (!isValidFlatNumber(participantFlatNo)) {
      setError('Flat must use the format 1A/B1 through 6L/B6.');
      return;
    }
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > (performanceMode === 'GROUP' ? 20 : 10)) {
      setError(`Probable time must be 1-${performanceMode === 'GROUP' ? 20 : 10} minutes.`);
      return;
    }
    if (!performanceSummary.trim()) {
      setError('Enter a brief summary of the performance.');
      return;
    }

    const program = nominateTarget;
    const check = checkNominationEligibility({
      program: {
        id: program.id,
        status: program.status,
        nominationOpenAt: program.nominationOpenAt,
        nominationCloseAt: program.nominationCloseAt,
      },
      existingNominations: nominations.map((n) => ({ programId: n.programId, status: n.status })),
      unlimited: user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN',
    });
    if (!check.ok) {
      setError(
        check.reason === 'NOT_PUBLISHED'
          ? 'Nominations are not open for this program.'
          : check.reason === 'WINDOW_CLOSED'
            ? 'The nomination window for this program is closed.'
             : 'You can submit a maximum of 2 nominations for this program.',
      );
      return;
    }

    setError('');
    setLoading(true);
    try {
      await api.post('/nominations', {
        programId: program.id, participantName: participantName.trim(), participantPhone: participantPhone.trim(),
        participantFlatNo: participantFlatNo.trim().toUpperCase(), participantAge: age,
        performanceMode, performanceType, probableTimeMinutes: minutes,
        performanceSummary: performanceSummary.trim(), photoData,
      });
      await loadHome();
      handleCloseNominate();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const choosePhoto = async (capture: boolean) => {
    const permission = capture
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo permission is required.');
      return;
    }
    const result = capture
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.55, base64: true })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.55, base64: true });
    if (!result.canceled && result.assets[0]?.base64) {
      setPhotoData(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  if (screen === 'home') {
    return (
      <ImageBackground source={require('./assets/hero-durga-puja.jpg')} style={styles.backgroundImage} resizeMode="cover">
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadHome} tintColor="#f9d27a" />}
        >
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.brand}>CTR-CMS</Text>
              <Text style={styles.miniLabel}>Belgharia Club Town Cultural Association</Text>
            </View>
            <Pressable onPress={handleLogout} style={styles.logoutButton}>
              <Text style={styles.logoutText}>Logout</Text>
            </Pressable>
          </View>

          <View style={styles.heroCard}>
            <Text style={styles.heroEyebrow}>Festival 2026</Text>
            <Text style={styles.heroTitle}>Welcome back, {user?.fullName || 'Resident'}</Text>
            <Text style={styles.heroText}>Your cultural calendar, nominations, and event reminders are ready.</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}><Text style={styles.statValue}>{String(events.length).padStart(2, '0')}</Text><Text style={styles.statLabel}>Events</Text></View>
            <View style={styles.statBox}><Text style={styles.statValue}>{String(activeNominationCount).padStart(2, '0')}</Text><Text style={styles.statLabel}>Nominations</Text></View>
            <View style={styles.statBox}><Text style={styles.statValue}>{String(programs.filter((p) => p.status === 'PUBLISHED').length).padStart(2, '0')}</Text><Text style={styles.statLabel}>Programs</Text></View>
          </View>

          <Text style={styles.sectionLabel}>Upcoming Cultural Events</Text>
          {loading && <ActivityIndicator color="#f9d27a" style={{ marginVertical: 12 }} />}

          {events.map((event, index) => (
            <View key={event.id} style={styles.card}>
              <Image source={eventThumbnails[index % eventThumbnails.length]} style={styles.cardImage} resizeMode="cover" />
              <View style={styles.cardBody}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.cardTitle}>{event.title}</Text>
                  <Text style={styles.tag}>{event.status}</Text>
                </View>
                <Text style={styles.metaText}>{event.venue}</Text>
                <Text style={styles.metaText}>
                  {new Date(event.startAt).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </Text>

                <View style={styles.programList}>
                  {programs
                    .filter((program) => program.eventId === event.id)
                    .map((program) => (
                      <Text key={program.id} style={styles.programText}>
                        • {program.name}
                      </Text>
                    ))}
                </View>
              </View>
            </View>
          ))}

          <Text style={styles.sectionLabel}>Messages</Text>
          <View style={styles.card}>
            {notifications.length === 0 ? (
              <Text style={styles.metaText}>You have no messages.</Text>
            ) : (
              notifications.map((notification) => (
                <Pressable key={notification.id} onPress={() => markNotificationRead(notification)} style={styles.messageRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.programText}>{notification.title}</Text>
                    <Text style={styles.metaText}>{notification.body}</Text>
                    <Text style={styles.messageDate}>{new Date(notification.createdAt).toLocaleString('en-IN')}</Text>
                  </View>
                  {!notification.readAt ? <Text style={styles.unreadBadge}>NEW</Text> : null}
                </Pressable>
              ))
            )}
          </View>

          <Text style={styles.sectionLabel}>Live programs</Text>
          <View style={styles.card}>
            {livePrograms.length === 0 ? (
              <Text style={styles.metaText}>No programs are live right now.</Text>
            ) : (
              livePrograms.map((program) => (
                <View key={program.id} style={styles.programRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.programText}>• {program.name}</Text>
                    <Text style={styles.metaText}>{program.event?.title ?? 'Current event'}</Text>
                  </View>
                  <Text style={styles.tag}>LIVE</Text>
                </View>
              ))
            )}
          </View>

          <Text style={styles.sectionLabel}>Today's schedule</Text>
          <View style={styles.card}>
            {todaySchedule.length === 0 ? (
              <Text style={styles.metaText}>No performances scheduled for today.</Text>
            ) : (
              todaySchedule.map((slot) => (
                <View key={slot.id} style={styles.programRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.programText}>• {slot.programName}</Text>
                    <Text style={styles.metaText}>
                      {new Date(slot.startAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
                      {' – '}
                      {new Date(slot.endAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
                      {slot.venue ? ` • ${slot.venue}` : ''}
                    </Text>
                  </View>
                  <Text style={styles.tag}>{slot.status}</Text>
                </View>
              ))
            )}
          </View>

          <Text style={styles.sectionLabel}>Upcoming programs</Text>
          <View style={styles.card}>
            {upcomingPrograms.length === 0 ? (
              <Text style={styles.metaText}>No upcoming programs have been published.</Text>
            ) : (
              upcomingPrograms.slice(0, 8).map((program) => (
                <View key={program.id} style={styles.programRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.programText}>• {program.name}</Text>
                    <Text style={styles.metaText}>
                      {program.event?.title ?? 'Upcoming event'}
                      {program.event?.startAt ? ` • ${new Date(program.event.startAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>

          <Text style={styles.sectionLabel}>Festival Moments</Text>
          <View style={styles.galleryGrid}>
            {galleryImages.map((image, idx) => (
              <View key={image.id} style={[styles.galleryTile, { height: idx % 4 === 0 ? 190 : 150 }]}>
                <Pressable onPress={() => setSelectedGalleryIndex(idx)} style={styles.galleryImageButton}>
                  <Image source={{ uri: image.imageUrl }} style={styles.galleryImage} resizeMode="cover" />
                </Pressable>
                {image.caption || image.title ? <Text style={styles.galleryCaption}>{image.title || image.caption}</Text> : null}
              </View>
            ))}
          </View>
          <Modal
            visible={selectedGalleryIndex !== null}
            transparent
            animationType="fade"
            onRequestClose={() => setSelectedGalleryIndex(null)}
          >
            <View style={styles.galleryViewer}>
              <Pressable style={styles.galleryCloseButton} onPress={() => setSelectedGalleryIndex(null)}>
                <Text style={styles.galleryCloseText}>Close</Text>
              </Pressable>
              {selectedGalleryIndex !== null && galleryImages[selectedGalleryIndex] ? (
                <>
                  <Image source={{ uri: galleryImages[selectedGalleryIndex].imageUrl }} style={styles.galleryExpandedImage} resizeMode="contain" />
                  <View style={styles.galleryNavigation}>
                    <Pressable
                      onPress={() => setSelectedGalleryIndex((selectedGalleryIndex - 1 + galleryImages.length) % galleryImages.length)}
                      style={styles.galleryNavButton}
                    >
                      <Text style={styles.galleryNavText}>Previous</Text>
                    </Pressable>
                    <Text style={styles.galleryCounter}>{selectedGalleryIndex + 1} / {galleryImages.length}</Text>
                    <Pressable
                      onPress={() => setSelectedGalleryIndex((selectedGalleryIndex + 1) % galleryImages.length)}
                      style={styles.galleryNavButton}
                    >
                      <Text style={styles.galleryNavText}>Next</Text>
                    </Pressable>
                  </View>
                </>
              ) : null}
            </View>
          </Modal>
          {galleryImages.length === 0 ? <Text style={styles.metaText}>Festival moments will appear here when the admin uploads them.</Text> : null}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Programs open for registration</Text>
            <Text style={styles.metaText}>Nominate yourself or a family member for an open program.</Text>

            <View style={styles.programList}>
              {openPrograms
                .map((program) => {
                  const eligibility = checkNominationEligibility({
                    program: {
                      id: program.id,
                      status: program.status,
                      nominationOpenAt: program.nominationOpenAt,
                      nominationCloseAt: program.nominationCloseAt,
                    },
                    existingNominations: nominations.map((n) => ({ programId: n.programId, status: n.status })),
                    unlimited: user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN',
                  });
                  return (
                    <View key={program.id} style={styles.programRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.programText}>• {program.name}</Text>
                        <Text style={styles.metaText}>
                          {program.event
                            ? `${program.event.title} • ${new Date(program.event.startAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} • ${new Date(program.event.startAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`
                            : ''}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => {
                          if (eligibility.ok) {
                            setParticipantName(user?.fullName ?? '');
                            setParticipantPhone(user?.phone ?? '');
                            setParticipantFlatNo(user?.flatNo ?? '');
                            setNominateTarget(program);
                            setError('');
                          } else {
                            setError(
                                eligibility.reason === 'MAX_NOMINATIONS_REACHED'
                                ? 'You can submit a maximum of 2 nominations for this program.'
                                : 'This program is not accepting nominations right now.',
                            );
                          }
                        }}
                        style={[styles.nominateButton, !eligibility.ok && styles.disabledButton]}
                      >
                        <Text style={styles.nominateText}>{eligibility.ok ? 'Nominate' : 'Closed'}</Text>
                      </Pressable>
                    </View>
                  );
                })}
              {openPrograms.length === 0 ? <Text style={styles.metaText}>There are no programs open for registration right now.</Text> : null}
            </View>
          </View>

          {nominateTarget ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Nominate for {nominateTarget.name}</Text>
              <TextInput
                value={participantName}
                onChangeText={setParticipantName}
                style={styles.input}
                placeholder="Participant name"
              />
              <TextInput value={participantPhone} onChangeText={setParticipantPhone} style={styles.input} placeholder="Mobile (+91XXXXXXXXXX)" keyboardType="phone-pad" />
              <TextInput value={participantFlatNo} onChangeText={setParticipantFlatNo} style={styles.input} placeholder="Flat / Block (e.g. 1A/B1)" autoCapitalize="characters" />
              <TextInput value={participantAge} onChangeText={setParticipantAge} style={styles.input} placeholder="Age" keyboardType="number-pad" />
              <Text style={styles.fieldLabel}>Performance</Text>
              <View style={styles.choiceRow}>
                {(['SOLO', 'GROUP'] as const).map((mode) => (
                  <Pressable key={mode} onPress={() => setPerformanceMode(mode)} style={[styles.choiceButton, performanceMode === mode && styles.choiceButtonSelected]}>
                    <Text style={styles.choiceText}>{mode}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.fieldLabel}>Type of performance</Text>
              <View style={styles.choiceRow}>
                {[
                  ['DANCE', 'Dance'], ['SINGING', 'Singing'], ['DRAMA', 'Drama'],
                  ['RECITATION', 'Recitation'], ['INSTRUMENT', 'Playing instrument'],
                ].map(([value, label]) => (
                  <Pressable key={value} onPress={() => setPerformanceType(value)} style={[styles.choiceButton, performanceType === value && styles.choiceButtonSelected]}>
                    <Text style={styles.choiceText}>{label}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput value={probableTimeMinutes} onChangeText={setProbableTimeMinutes} style={styles.input} placeholder={`Probable time (max ${performanceMode === 'GROUP' ? 20 : 10} minutes)`} keyboardType="number-pad" />
              <TextInput value={performanceSummary} onChangeText={setPerformanceSummary} style={[styles.input, styles.multilineInput]} placeholder="Brief summary of the performance" multiline />
              <Text style={styles.fieldLabel}>Photo (optional)</Text>
              <View style={styles.choiceRow}>
                <Pressable onPress={() => choosePhoto(true)} style={styles.choiceButton}><Text style={styles.choiceText}>Open camera</Text></Pressable>
                <Pressable onPress={() => choosePhoto(false)} style={styles.choiceButton}><Text style={styles.choiceText}>Upload photo</Text></Pressable>
              </View>
              {photoData ? <Image source={{ uri: photoData }} style={styles.photoPreview} /> : null}
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <Pressable style={[styles.primaryButton, loading && styles.disabledButton]} onPress={handleNominate}>
                {loading ? <ActivityIndicator color="#fffaf0" /> : <Text style={styles.primaryButtonText}>Submit nomination</Text>}
              </Pressable>
              <Pressable onPress={handleCloseNominate} style={{ marginTop: 10 }}>
                <Text style={styles.linkText}>Cancel</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>My nominations</Text>
            {nominations.length === 0 ? (
              <Text style={styles.metaText}>You have not nominated for any program yet.</Text>
            ) : (
              nominations.map((nomination) => {
                const program = programs.find((p) => p.id === nomination.programId);
                const slot = nomination.allocatedSlot;
                return (
                  <View key={nomination.id} style={styles.programRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.programText}>• {program?.name ?? nomination.programId}</Text>
                      <Text style={styles.metaText}>{nomination.participantName}</Text>
                      {slot ? (
                        <Text style={styles.metaText}>
                          {new Date(slot.startAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                          {slot.venue ? ` • ${slot.venue}` : ''}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={styles.tag}>{nomination.status}</Text>
                  </View>
                );
              })
            )}
          </View>

          <StatusBar style="light" />
        </ScrollView>
      </ImageBackground>
    );
  }

  if (screen === 'otp') {
    return (
      <ImageBackground source={require('./assets/hero-durga-puja.jpg')} style={styles.backgroundImage} resizeMode="cover">
        <View style={styles.authContainer}>
          <View style={styles.authCard}>
            {otpVerified && otpPurpose === 'password_reset' ? (
              <>
                <Text style={styles.title}>Set new password</Text>
                <Text style={styles.subtitle}>Enter a new password for {phone}</Text>
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  style={styles.input}
                  placeholder="New password (min 8 chars)"
                  secureTextEntry
                />
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                <Pressable style={styles.primaryButton} onPress={handleResetPassword}>
                  <Text style={styles.primaryButtonText}>{loading ? 'Saving…' : 'Set password'}</Text>
                </Pressable>
                <Pressable onPress={() => { setOtpVerified(false); setNewPassword(''); setError(''); }}>
                  <Text style={styles.linkText}>Re-enter OTP</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.title}>Verify OTP</Text>
                <Text style={styles.subtitle}>We sent a 6-digit OTP to your email address.</Text>
                {devOtp ? <Text style={styles.devHint}>Dev code: {devOtp}</Text> : null}
                <TextInput
                  value={otp}
                  onChangeText={setOtp}
                  style={styles.input}
                  placeholder="Enter 6-digit OTP"
                  keyboardType="number-pad"
                  maxLength={6}
                />
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                <Pressable style={styles.primaryButton} onPress={handleVerifyOtp}>
                  <Text style={styles.primaryButtonText}>{loading ? 'Verifying…' : 'Verify'}</Text>
                </Pressable>
              </>
            )}

            <Pressable onPress={() => setScreen('login')}>
              <Text style={styles.linkText}>Back to login</Text>
            </Pressable>
          </View>
        </View>
      </ImageBackground>
    );
  }

  if (screen === 'signup') {
    return (
      <ImageBackground source={require('./assets/hero-durga-puja.jpg')} style={styles.backgroundImage} resizeMode="cover">
        <ScrollView style={styles.authContainerScroll} contentContainerStyle={styles.authContent}>
          <View style={styles.authCard}>
            <Text style={styles.title}>Resident onboarding</Text>
            <Text style={styles.subtitle}>We&#39;ll send a 6-digit OTP to your email address</Text>

            <TextInput value={fullName} onChangeText={setFullName} style={styles.input} placeholder="Full name" />
            <TextInput value={phone} onChangeText={setPhone} style={styles.input} placeholder="Indian mobile (+91XXXXXXXXXX)" keyboardType="phone-pad" />
            <TextInput value={flatNo} onChangeText={setFlatNo} style={styles.input} placeholder="Flat / Block (e.g. 1A/B1)" />
            <TextInput value={email} onChangeText={setEmail} style={styles.input} placeholder="Email (required for verification)" keyboardType="email-address" />
            <TextInput
              value={password}
              onChangeText={setPassword}
              style={styles.input}
              placeholder="Set password"
              secureTextEntry
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable style={[styles.primaryButton, loading && styles.disabledButton]} onPress={handleCreateAccount}>
              {loading ? <ActivityIndicator color="#fffaf0" /> : <Text style={styles.primaryButtonText}>Send verification code</Text>}
            </Pressable>

            <Pressable onPress={() => setScreen('login')}>
              <Text style={styles.linkText}>Already have an account?</Text>
            </Pressable>
          </View>
        </ScrollView>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={require('./assets/hero-festival.jpg')} style={styles.backgroundImage} resizeMode="cover">
      <View style={styles.authContainer}>
        <View style={styles.authCard}>
          <Text style={styles.title}>CTR-CMS</Text>
          <Text style={styles.subtitle}>Belgharia Club Town Cultural Association</Text>

          <TextInput
            value={loginEmail}
            onChangeText={setLoginEmail}
            style={styles.input}
            placeholder="Enter your email"
            keyboardType="email-address"
          />

          <TextInput
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            placeholder="Password"
            secureTextEntry
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable style={[styles.primaryButton, loading && styles.disabledButton]} onPress={handleLogin}>
            {loading ? <ActivityIndicator color="#fffaf0" /> : <Text style={styles.primaryButtonText}>Login</Text>}
          </Pressable>

          <Pressable style={styles.secondaryButton} onPress={handleSendOtp}>
            <Text style={styles.secondaryButtonText}>Forgot password / OTP reset</Text>
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={() => {
              setFullName('');
              setPhone('');
              setFlatNo('');
              setEmail('');
              setPassword('');
              setSignupStep('details');
              setError('');
              setScreen('signup');
            }}
          >
            <Text style={styles.secondaryButtonText}>Create resident account</Text>
          </Pressable>

          <Text style={styles.footnote}>Email + Password login • OTP recovery • Resident onboarding</Text>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: 'rgba(22, 10, 15, 0.38)',
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 46,
    paddingBottom: 30,
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 30,
    backgroundColor: 'rgba(20, 10, 12, 0.42)',
  },
  authContainerScroll: {
    flex: 1,
    paddingHorizontal: 22,
    paddingVertical: 30,
    backgroundColor: 'rgba(20, 10, 12, 0.42)',
  },
  authContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 36,
  },
  authCard: {
    backgroundColor: 'rgba(29, 15, 18, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(246, 190, 88, 0.5)',
    borderRadius: 22,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#f9d27a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#fbe7b2',
    marginBottom: 18,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderWidth: 1,
    borderColor: '#e7b75f',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  multilineInput: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  fieldLabel: {
    color: '#fbe7b2',
    fontWeight: '700',
    marginBottom: 8,
  },
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  choiceButton: {
    borderWidth: 1,
    borderColor: '#e7b75f',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  choiceButtonSelected: {
    backgroundColor: '#d7912b',
  },
  choiceText: {
    color: '#fffaf0',
    fontWeight: '700',
    fontSize: 12,
  },
  photoPreview: {
    width: 120,
    height: 120,
    borderRadius: 12,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#d7912b',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#fffaf0',
    fontWeight: '800',
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.6,
  },
  secondaryButton: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(249,210,122,0.6)',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryButtonText: {
    color: '#fcecc4',
    fontWeight: '700',
    fontSize: 15,
  },
  errorText: {
    color: '#ffd9d9',
    marginBottom: 10,
    fontSize: 13,
  },
  devHint: {
    color: '#aef0ae',
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '700',
  },
  linkText: {
    textAlign: 'center',
    color: '#f9d27a',
    marginTop: 12,
    fontWeight: '700',
  },
  footnote: {
    color: '#f8e9c8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
    opacity: 0.9,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  brand: {
    fontSize: 30,
    fontWeight: '800',
    color: '#f8d06f',
  },
  miniLabel: {
    color: '#f8e9c8',
    fontSize: 12,
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(249,210,122,0.5)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  logoutText: {
    color: '#fffaf0',
    fontWeight: '700',
  },
  heroCard: {
    backgroundColor: 'rgba(17, 6, 10, 0.54)',
    borderWidth: 1,
    borderColor: 'rgba(244, 181, 66, 0.5)',
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
  },
  heroEyebrow: {
    color: '#f9d27a',
    fontSize: 12,
    letterSpacing: 1.2,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#fff3d0',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 6,
  },
  heroText: {
    color: '#f6e4b7',
    fontSize: 13,
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(30, 14, 17, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(249,210,122,0.4)',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f9d27a',
  },
  statLabel: {
    fontSize: 11,
    color: '#f5e7c2',
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff1cc',
    marginBottom: 12,
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  galleryTile: {
    width: '48.5%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(249,210,122,0.4)',
    backgroundColor: 'rgba(20, 11, 14, 0.7)',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  galleryImageButton: {
    flex: 1,
  },
  galleryCaption: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 8,
    color: '#fffaf0',
    backgroundColor: 'rgba(0,0,0,0.55)',
    fontSize: 12,
  },
  galleryViewer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.96)',
    justifyContent: 'center',
    padding: 20,
  },
  galleryCloseButton: {
    alignSelf: 'flex-end',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  galleryCloseText: {
    color: '#fffaf0',
    fontWeight: '700',
  },
  galleryExpandedImage: {
    flex: 1,
    width: '100%',
    marginVertical: 16,
  },
  galleryNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  galleryNavButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  galleryNavText: {
    color: '#fffaf0',
    fontWeight: '700',
  },
  galleryCounter: {
    color: '#fffaf0',
    fontWeight: '700',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  messageDate: {
    color: '#d9c39a',
    fontSize: 11,
    marginTop: 4,
  },
  unreadBadge: {
    color: '#1f160b',
    backgroundColor: '#f9d27a',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
    fontSize: 10,
    fontWeight: '800',
  },
  card: {
    backgroundColor: 'rgba(20, 11, 14, 0.78)',
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(249,210,122,0.35)',
  },
  cardImage: {
    width: '100%',
    height: 150,
  },
  cardBody: {
    padding: 14,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff4d1',
    marginBottom: 6,
    flex: 1,
  },
  tag: {
    backgroundColor: '#6d1d26',
    borderRadius: 999,
    overflow: 'hidden',
    color: '#f7d37b',
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  metaText: {
    color: '#f6dca0',
    fontSize: 13,
    marginBottom: 4,
  },
  programList: {
    marginTop: 10,
  },
  programRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(249,210,122,0.12)',
  },
  nominateButton: {
    backgroundColor: '#d7912b',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  nominateText: {
    color: '#fffaf0',
    fontWeight: '800',
    fontSize: 13,
  },
  programText: {
    color: '#fcecc4',
    fontSize: 13,
    marginBottom: 4,
  },
});
