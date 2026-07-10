import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Screen } from '../components/Screen';
import { ThemedText } from '../components/ThemedText';
import { SettingsSection } from '../components/SettingsSection';
import { Button } from '../components/Button';
import { ChipRow } from '../components/ChipRow';
import { TextField } from '../components/TextField';
import { useAppTheme } from '../theme/ThemeContext';
import { useProfile } from '../features/profile/ProfileContext';
import { AVATAR_EMOJI_CHOICES } from '../features/profile/types';
import { useCircles } from '../features/circles/useCircles';
import { useEvents } from '../features/events/useEvents';

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('it-IT', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function ProfileSection() {
  const { profile, saveProfile, signOut } = useProfile();
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState(profile?.phoneNumber ?? '');
  const [name, setName] = useState(profile?.displayName ?? '');
  const [avatar, setAvatar] = useState(profile?.avatarEmoji ?? AVATAR_EMOJI_CHOICES[0]);

  if (profile && !editing) {
    return (
      <View style={styles.profileRow}>
        <AvatarBubble emoji={profile.avatarEmoji} />
        <View style={{ flex: 1 }}>
          <ThemedText variant="body" bold>
            {profile.displayName}
          </ThemedText>
          <ThemedText variant="caption" color="secondary">
            {profile.phoneNumber}
          </ThemedText>
        </View>
        <Button label="Modifica" onPress={() => setEditing(true)} />
      </View>
    );
  }

  const canSave = phone.trim().length >= 6 && name.trim().length > 0;

  return (
    <View style={{ padding: 14 }}>
      <TextField
        label="Numero di telefono"
        placeholder="+39 333 1234567"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />
      <TextField label="Nome visualizzato" placeholder="Il tuo nome" value={name} onChangeText={setName} />
      <ThemedText variant="caption" color="secondary" style={{ marginBottom: 4 }}>
        Avatar
      </ThemedText>
      <ChipRow
        value={avatar}
        onChange={setAvatar}
        options={AVATAR_EMOJI_CHOICES.map((e) => ({ value: e, label: e }))}
      />
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
        <Button
          label={profile ? 'Salva' : 'Registrati'}
          variant="primary"
          disabled={!canSave}
          onPress={() => {
            saveProfile({ phoneNumber: phone.trim(), displayName: name.trim(), avatarEmoji: avatar, createdAt: new Date().toISOString() });
            setEditing(false);
          }}
          style={{ flex: 1 }}
        />
        {profile && (
          <Button
            label="Esci"
            variant="danger"
            onPress={() => {
              signOut();
              setEditing(false);
              setPhone('');
              setName('');
            }}
          />
        )}
      </View>
      <ThemedText variant="caption" color="secondary" style={{ marginTop: 8 }}>
        Registrazione locale su questo dispositivo — non c'è ancora un backend che
        verifichi il numero via SMS o sincronizzi tra dispositivi.
      </ThemedText>
    </View>
  );
}

function AvatarBubble({ emoji }: { emoji: string }) {
  const { palette } = useAppTheme();
  return (
    <View style={[styles.avatar, { backgroundColor: palette.surfaceAlt, borderColor: palette.accent }]}>
      <ThemedText variant="subtitle">{emoji}</ThemedText>
    </View>
  );
}

function CirclesSection() {
  const { palette } = useAppTheme();
  const { circles, createCircle, deleteCircle } = useCircles();
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  return (
    <>
      {circles.map((circle, i) => (
        <View
          key={circle.id}
          style={[
            styles.rowPadded,
            i < circles.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.border },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <ThemedText variant="body">{circle.name}</ThemedText>
              <ThemedText variant="caption" color="secondary">
                {circle.memberNames.length > 0 ? circle.memberNames.join(', ') : 'Nessun membro ancora'}
              </ThemedText>
            </View>
            <Button label="Elimina" variant="danger" onPress={() => deleteCircle(circle.id)} />
          </View>
        </View>
      ))}

      <View style={{ padding: 14 }}>
        {creating ? (
          <>
            <TextField placeholder="Nome della cerchia" value={newName} onChangeText={setNewName} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button
                label="Crea"
                variant="primary"
                disabled={newName.trim().length === 0}
                onPress={() => {
                  createCircle(newName.trim());
                  setNewName('');
                  setCreating(false);
                }}
                style={{ flex: 1 }}
              />
              <Button label="Annulla" onPress={() => setCreating(false)} />
            </View>
          </>
        ) : (
          <Button label="+ Crea nuova cerchia" onPress={() => setCreating(true)} />
        )}
      </View>
    </>
  );
}

function EventsSection() {
  const { palette } = useAppTheme();
  const { profile } = useProfile();
  const { circles } = useCircles();
  const { events, createEvent, respond, deleteEvent } = useEvents();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [circleId, setCircleId] = useState<string | undefined>(undefined);

  const myName = profile?.displayName ?? 'Io';

  const canCreate = title.trim().length > 0 && /^\d{2}\/\d{2}\/\d{4}$/.test(date) && /^\d{2}:\d{2}$/.test(time);

  const submit = () => {
    const [dd, mm, yyyy] = date.split('/');
    const [hh, min] = time.split(':');
    const iso = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min)).toISOString();
    createEvent(title.trim(), iso, circleId);
    setTitle('');
    setDate('');
    setTime('');
    setCreating(false);
  };

  return (
    <>
      {events.length === 0 && !creating && (
        <ThemedText variant="caption" color="secondary" style={{ padding: 14 }}>
          Nessun evento in programma.
        </ThemedText>
      )}
      {events.map((event, i) => {
        const myResponse = event.confirmed.includes(myName) ? 'confirmed' : event.declined.includes(myName) ? 'declined' : undefined;
        return (
          <View
            key={event.id}
            style={[
              styles.rowPadded,
              i < events.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.border },
            ]}
          >
            <ThemedText variant="body" bold>
              {event.title}
            </ThemedText>
            <ThemedText variant="caption" color="secondary" style={{ marginTop: 2 }}>
              {formatDateTime(event.dateTime)}
            </ThemedText>
            <ThemedText variant="caption" color="secondary" style={{ marginTop: 8 }}>
              Confermati: {event.confirmed.length > 0 ? event.confirmed.join(', ') : '—'} (
              {event.confirmed.length}/{event.neededPlayers})
            </ThemedText>
            <View style={styles.rsvpRow}>
              <Button
                label={myResponse === 'confirmed' ? '✓ Confermato' : '✓ Confermo'}
                variant="primary"
                onPress={() => respond(event.id, myName, 'confirmed')}
                style={{ flex: 1 }}
              />
              <Button
                label={myResponse === 'declined' ? '✕ Rifiutato' : '✕ Rifiuto'}
                variant="danger"
                onPress={() => respond(event.id, myName, 'declined')}
                style={{ flex: 1 }}
              />
            </View>
            <Button label="Elimina evento" onPress={() => deleteEvent(event.id)} style={{ marginTop: 8 }} />
          </View>
        );
      })}

      <View style={{ padding: 14 }}>
        {creating ? (
          <>
            <TextField placeholder="Titolo (es. Partita al Circolo Roma)" value={title} onChangeText={setTitle} />
            <TextField placeholder="Data gg/mm/aaaa" value={date} onChangeText={setDate} keyboardType="numbers-and-punctuation" />
            <TextField placeholder="Ora hh:mm" value={time} onChangeText={setTime} keyboardType="numbers-and-punctuation" />
            {circles.length > 0 && (
              <>
                <ThemedText variant="caption" color="secondary" style={{ marginBottom: 4 }}>
                  Cerchia (opzionale)
                </ThemedText>
                <ChipRow
                  value={circleId}
                  onChange={setCircleId}
                  options={circles.map((c) => ({ value: c.id, label: c.name }))}
                />
              </>
            )}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <Button label="Crea evento" variant="primary" disabled={!canCreate} onPress={submit} style={{ flex: 1 }} />
              <Button label="Annulla" onPress={() => setCreating(false)} />
            </View>
          </>
        ) : (
          <Button label="+ Nuovo evento" onPress={() => setCreating(true)} />
        )}
      </View>
    </>
  );
}

export function CommunityScreen() {
  return (
    <Screen scroll>
      <ThemedText variant="title" style={{ marginBottom: 4 }}>
        Community
      </ThemedText>
      <ThemedText variant="caption" color="secondary" style={{ marginBottom: 20 }}>
        Profilo, cerchie ed eventi sono salvati su questo dispositivo — la sincronizzazione tra
        giocatori richiede un backend non ancora collegato.
      </ThemedText>

      <SettingsSection title="Il tuo profilo">
        <ProfileSection />
      </SettingsSection>

      <SettingsSection title="Le tue cerchie">
        <CirclesSection />
      </SettingsSection>

      <SettingsSection title="Eventi">
        <EventsSection />
      </SettingsSection>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  avatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  rowPadded: { padding: 14 },
  rsvpRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
});
