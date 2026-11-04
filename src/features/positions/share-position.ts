import { Share } from 'react-native';

export async function sharePosition(url: string): Promise<void> {
  await Share.share({ message: url, url });
}
