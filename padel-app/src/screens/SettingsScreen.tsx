import React from 'react';
import { View } from 'react-native';
import { Screen } from '../components/Screen';
import { ThemedText } from '../components/ThemedText';
import { SettingsSection } from '../components/SettingsSection';
import { SettingsRow, SettingsSwitchRow } from '../components/SettingsRow';
import { ChipRow } from '../components/ChipRow';
import { BleScanPanel } from '../components/BleScanPanel';
import { useAppTheme } from '../theme/ThemeContext';
import { useAnnouncerSetting } from '../features/audio/useAnnouncerSetting';
import { useRemoteInput } from '../features/remote/RemoteInputService';
import { RemoteAction } from '../features/remote/types';

const ACTION_LABELS: Record<RemoteAction, string> = {
  pointA: 'Punto Squadra A',
  pointB: 'Punto Squadra B',
  undo: 'Annulla ultimo punto',
};

export function SettingsScreen() {
  const { settings, setMode, setFontScale, setFontFamily } = useAppTheme();
  const { enabled: announcerEnabled, setEnabled: setAnnouncerEnabled } = useAnnouncerSetting();
  const { bindings, setBinding, allSources, registerBleSource } = useRemoteInput(() => {});

  return (
    <Screen scroll>
      <ThemedText variant="title" style={{ marginBottom: 20 }}>
        Impostazioni
      </ThemedText>

      <SettingsSection title="Tema">
        <View style={{ padding: 4 }}>
          <ChipRow
            value={settings.mode}
            onChange={setMode}
            options={[
              { value: 'dark', label: 'Scuro' },
              { value: 'light', label: 'Chiaro' },
              { value: 'light-contrast', label: 'Alto contrasto' },
              { value: 'system', label: 'Sistema' },
            ]}
          />
        </View>
      </SettingsSection>

      <SettingsSection title="Testo">
        <SettingsRow label="Dimensione carattere" />
        <View style={{ paddingHorizontal: 0 }}>
          <ChipRow
            value={settings.fontScale}
            onChange={setFontScale}
            options={[
              { value: 'small', label: 'Piccolo' },
              { value: 'medium', label: 'Medio' },
              { value: 'large', label: 'Grande' },
              { value: 'xlarge', label: 'Molto grande' },
            ]}
          />
        </View>
        <SettingsRow label="Font" divider={false} />
        <View style={{ paddingHorizontal: 0 }}>
          <ChipRow
            value={settings.fontFamily}
            onChange={setFontFamily}
            options={[
              { value: 'system', label: 'Sistema' },
              { value: 'rounded', label: 'Arrotondato' },
              { value: 'mono', label: 'Monospace' },
            ]}
          />
        </View>
      </SettingsSection>

      <SettingsSection title="Audio annunci">
        <SettingsSwitchRow
          label="Annuncia il punteggio"
          subtitle="Legge ad alta voce il punteggio dopo ogni punto (instrada sull'uscita audio attiva, incluse le casse Bluetooth)"
          value={announcerEnabled}
          onValueChange={setAnnouncerEnabled}
          divider={false}
        />
      </SettingsSection>

      <SettingsSection title="Telecomando e Bluetooth">
        {(Object.keys(ACTION_LABELS) as RemoteAction[]).map((action, i, arr) => (
          <View key={action}>
            <SettingsRow label={ACTION_LABELS[action]} divider={i < arr.length - 1} />
            <View style={{ paddingHorizontal: 0, marginTop: -8 }}>
              <ChipRow
                value={bindings[action]}
                onChange={(sourceId) => setBinding(action, sourceId)}
                options={allSources.map((s) => ({ value: s.id, label: s.label }))}
              />
            </View>
          </View>
        ))}
      </SettingsSection>

      <SettingsSection title="Cerca telecomando Bluetooth (BLE)">
        <BleScanPanel onSourceFired={registerBleSource} />
      </SettingsSection>

      <SettingsSection title="Cloud">
        <SettingsSwitchRow
          label="Sincronizzazione cloud"
          subtitle="Sincronizza impostazioni, avatar e statistiche (richiede account — in arrivo)"
          value={false}
          onValueChange={() => {}}
          divider={false}
        />
      </SettingsSection>
    </Screen>
  );
}
