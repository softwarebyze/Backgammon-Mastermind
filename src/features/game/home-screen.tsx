import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FocusAwareStatusBar } from '@/components/ui';
import { useGame } from '@/features/game/use-game';

const HOME_BG = '#1E0C02';

export function HomeScreen() {
  const { startGame } = useGame();

  const handleStart = (mode: 'vs-computer' | 'vs-human') => {
    startGame(mode);
    router.push('/game');
  };

  return (
    <SafeAreaView style={[styles.root, webSafeArea]} edges={['top', 'bottom']}>
      <FocusAwareStatusBar />
      <View style={styles.logoContainer}>
        <Image
          source={require('../../../assets/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <Text accessibilityRole="header" style={styles.title}>BACKGAMMON</Text>
      <Text style={styles.subtitle}>The classic strategy game</Text>

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <View style={styles.dividerDiamond} />
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Play against the computer"
          style={[styles.modeBtn, styles.primaryBtn]}
          onPress={() => handleStart('vs-computer')}
          activeOpacity={0.8}
        >
          <Feather name="cpu" size={24} color="#1E0C02" style={styles.btnIcon} />
          <View>
            <Text style={[styles.btnLabel, { color: '#1E0C02' }]}>vs Computer</Text>
            <Text style={[styles.btnSub, { color: '#4A2A10' }]}>Play against AI</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Play with two players locally"
          style={[styles.modeBtn, styles.secondaryBtn]}
          onPress={() => handleStart('vs-human')}
          activeOpacity={0.8}
        >
          <Feather name="users" size={24} color="#D4A843" style={styles.btnIcon} />
          <View>
            <Text style={[styles.btnLabel, { color: '#D4A843' }]}>2 Players</Text>
            <Text style={[styles.btnSub, { color: '#A08060' }]}>Pass & play locally</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.rulesCard}>
        <Text style={styles.rulesTitle}>How to Play</Text>
        <Text style={styles.rulesText}>• Roll dice, then move your checkers toward your home board</Text>
        <Text style={styles.rulesText}>• Land on a lone opponent checker to send it to the bar</Text>
        <Text style={styles.rulesText}>• Bear off all 15 checkers to win!</Text>
        <Text style={styles.rulesText}>• White moves from high → low, Black moves from low → high</Text>
      </View>
    </SafeAreaView>
  );
}

const webSafeArea = Platform.OS === 'web'
  ? { paddingTop: 16, paddingBottom: 16 }
  : null;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: HOME_BG,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    width: 110,
    height: 110,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#D4A843',
    marginBottom: 20,
    shadowColor: '#D4A843',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#D4A843',
    letterSpacing: 6,
    fontFamily: 'Inter_700Bold',
  },
  subtitle: {
    fontSize: 13,
    color: '#A08060',
    marginTop: 4,
    letterSpacing: 2,
    fontFamily: 'Inter_400Regular',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '60%',
    marginVertical: 28,
    gap: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#5A3A1A',
  },
  dividerDiamond: {
    width: 8,
    height: 8,
    backgroundColor: '#D4A843',
    transform: [{ rotate: '45deg' }],
  },
  buttons: {
    width: '100%',
    gap: 14,
    marginBottom: 28,
  },
  modeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderWidth: 2,
    gap: 16,
  },
  primaryBtn: {
    backgroundColor: '#D4A843',
    borderColor: '#F0C060',
  },
  secondaryBtn: {
    backgroundColor: '#2A1206',
    borderColor: '#8B5E3C',
  },
  btnIcon: {
    width: 28,
  },
  btnLabel: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  btnSub: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: 'Inter_400Regular',
  },
  rulesCard: {
    width: '100%',
    backgroundColor: '#2A1206',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#5A3A1A',
    padding: 16,
    gap: 6,
  },
  rulesTitle: {
    color: '#D4A843',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
    letterSpacing: 1,
  },
  rulesText: {
    color: '#A08060',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
  },
});
