import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, ImageBackground, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { isValidPhoneNumber, checkNominationEligibility } from '@ctr-cms/shared';
import { api, setAuthToken } from './src/api';
import type { FeedEvent, FeedProgram, AuthUser, Nomination } from './src/types';

type Screen = 'login' | 'otp' | 'signup' | 'home';

export default function App() {
  const [screen, setScreen] = useState<Screen>('login');
  const [phone, setPhone] = useState('+919876543210');
  const [password, setPassword] = useState('Welcome@123');
  const [otp, setOtp] = useState('123456');
  const [fullName, setFullName] = useState('Aarav Sharma');
  const [flatNo, setFlatNo] = useState('B-204');
  const [email, setEmail] = useState('aarav@clubtown.com');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [programs, setPrograms] = useState<FeedProgram[]>([]);
  const [nominations, setNominations] = useState<Nomination[]>([]);
  const [nominateTarget, setNominateTarget] = useState<FeedProgram | null>(null);
  const [participantName, setParticipantName] = useState('');

  const isPhoneValid = useMemo(() => isValidPhoneNumber(phone), [phone]);

  const activeNominationCount = useMemo(
    () => nominations.filter((n) => ['PENDING', 'APPROVED', 'WAITLISTED', 'SLOT_ALLOCATED', 'COMPLETED'].includes(n.status)).length,
    [nominations],
  );

  const loadHome = useCallback(() => {
    setLoading(true);
    const feedPromise = api.get<{ events: FeedEvent[]; programs: FeedProgram[] }>('/feed');
    const nominationPromise = api.get<{ nominations: Nomination[] }>('/nominations');
    Promise.all([feedPromise, nominationPromise])
      .then(([feed, nom]) => {
        setEvents(feed.events);
        setPrograms(feed.programs);
        setNominations(nom.nominations);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (screen !== 'home') return;
    loadHome();
  }, [screen, loadHome]);

  const handleLogin = async () => {
    if (!isPhoneValid) {
      setError('Enter a valid mobile number in E.164 format.');
      return;
    }
    if (!password.trim()) {
      setError('Password is required.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const data = await api.post<{ token: string; user: AuthUser }>('/auth/login', { phone, password });
      setAuthToken(data.token);
      setUser(data.user);
      setScreen('home');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = () => {
    if (!isPhoneValid) {
      setError('Please enter a valid mobile number before requesting OTP.');
      return;
    }
    setError('');
    setScreen('otp');
  };

  const handleVerifyOtp = () => {
    if (otp.trim().length !== 6) {
      setError('Enter the 6-digit OTP code.');
      return;
    }
    setError('');
    setScreen('home');
  };

  const handleCreateAccount = async () => {
    if (!fullName.trim() || !flatNo.trim()) {
      setError('Name and flat number are required.');
      return;
    }
    if (!isPhoneValid) {
      setError('Enter a valid resident phone number.');
      return;
    }
    if (!password.trim()) {
      setError('Create a password to complete onboarding.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const data = await api.post<{ token: string; user: AuthUser }>('/auth/register', {
        fullName,
        phone,
        email,
        flatNo,
        password,
      });
      setAuthToken(data.token);
      setUser(data.user);
      setScreen('home');
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
    setNominateTarget(null);
    setParticipantName('');
    setScreen('login');
  };

  const handleCloseNominate = () => {
    setNominateTarget(null);
    setParticipantName('');
    setError('');
  };

  const handleNominate = async () => {
    if (!nominateTarget) return;
    if (!participantName.trim()) {
      setError('Enter the participant name.');
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
    });
    if (!check.ok) {
      setError(
        check.reason === 'NOT_PUBLISHED'
          ? 'Nominations are not open for this program.'
          : check.reason === 'WINDOW_CLOSED'
            ? 'The nomination window for this program is closed.'
            : 'You already have an active nomination for this program.',
      );
      return;
    }

    setError('');
    setLoading(true);
    try {
      await api.post('/nominations', { programId: program.id, participantName: participantName.trim() });
      await loadHome();
      handleCloseNominate();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (screen === 'home') {
    return (
      <ImageBackground source={require('./assets/festival-hero.jpeg')} style={styles.backgroundImage} resizeMode="cover">
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.brand}>CTR-CMS</Text>
              <Text style={styles.miniLabel}>Clubtown Residency</Text>
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
            <View style={styles.statBox}><Text style={styles.statValue}>00</Text><Text style={styles.statLabel}>Slots</Text></View>
          </View>

          <Text style={styles.sectionLabel}>Upcoming Cultural Events</Text>
          {loading && <ActivityIndicator color="#f9d27a" style={{ marginVertical: 12 }} />}

          {events.map((event) => (
            <View key={event.id} style={styles.card}>
              <Image source={require('./assets/festival-detail.jpeg')} style={styles.cardImage} resizeMode="cover" />
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

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Open programs to nominate</Text>
            <Text style={styles.metaText}>Nominate yourself or a family member for an open program.</Text>

            <View style={styles.programList}>
              {programs
                .filter((program) => program.status === 'PUBLISHED')
                .map((program) => {
                  const eligibility = checkNominationEligibility({
                    program: {
                      id: program.id,
                      status: program.status,
                      nominationOpenAt: program.nominationOpenAt,
                      nominationCloseAt: program.nominationCloseAt,
                    },
                    existingNominations: nominations.map((n) => ({ programId: n.programId, status: n.status })),
                  });
                  return (
                    <View key={program.id} style={styles.programRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.programText}>• {program.name}</Text>
                        <Text style={styles.metaText}>{program.maxParticipants} slots</Text>
                      </View>
                      <Pressable
                        onPress={() => {
                          if (eligibility.ok) {
                            setParticipantName(user?.fullName ?? '');
                            setNominateTarget(program);
                            setError('');
                          } else {
                            setError(
                              eligibility.reason === 'ALREADY_NOMINATED'
                                ? 'You already have an active nomination for this program.'
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
                return (
                  <View key={nomination.id} style={styles.programRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.programText}>• {program?.name ?? nomination.programId}</Text>
                      <Text style={styles.metaText}>{nomination.participantName}</Text>
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
      <ImageBackground source={require('./assets/festival-hero.jpeg')} style={styles.backgroundImage} resizeMode="cover">
        <View style={styles.authContainer}>
          <View style={styles.authCard}>
            <Text style={styles.title}>Verify OTP</Text>
            <Text style={styles.subtitle}>We sent a 6-digit code to {phone}</Text>

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
              <Text style={styles.primaryButtonText}>Verify</Text>
            </Pressable>

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
      <ImageBackground source={require('./assets/festival-hero.jpeg')} style={styles.backgroundImage} resizeMode="cover">
        <ScrollView style={styles.authContainer} contentContainerStyle={styles.authContent}>
          <View style={styles.authCard}>
            <Text style={styles.title}>Resident onboarding</Text>
            <Text style={styles.subtitle}>Complete your profile</Text>

            <TextInput value={fullName} onChangeText={setFullName} style={styles.input} placeholder="Full name" />
            <TextInput value={phone} onChangeText={setPhone} style={styles.input} placeholder="Phone number" keyboardType="phone-pad" />
            <TextInput value={flatNo} onChangeText={setFlatNo} style={styles.input} placeholder="Flat / House number" />
            <TextInput value={email} onChangeText={setEmail} style={styles.input} placeholder="Email (optional)" keyboardType="email-address" />
            <TextInput
              value={password}
              onChangeText={setPassword}
              style={styles.input}
              placeholder="Set password"
              secureTextEntry
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable style={[styles.primaryButton, loading && styles.disabledButton]} onPress={handleCreateAccount}>
              {loading ? <ActivityIndicator color="#fffaf0" /> : <Text style={styles.primaryButtonText}>Create account</Text>}
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
    <ImageBackground source={require('./assets/festival-hero.jpeg')} style={styles.backgroundImage} resizeMode="cover">
      <View style={styles.authContainer}>
        <View style={styles.authCard}>
          <Text style={styles.title}>CTR-CMS</Text>
          <Text style={styles.subtitle}>Clubtown Residency</Text>

          <TextInput
            value={phone}
            onChangeText={setPhone}
            style={styles.input}
            placeholder="Mobile number"
            keyboardType="phone-pad"
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

          <Pressable style={styles.secondaryButton} onPress={() => setScreen('signup')}>
            <Text style={styles.secondaryButtonText}>Create resident account</Text>
          </Pressable>

          <Text style={styles.footnote}>Phone + Password login • OTP recovery • Resident onboarding</Text>
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
  authContent: {
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
