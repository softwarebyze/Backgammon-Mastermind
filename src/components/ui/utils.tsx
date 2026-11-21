import { showMessage } from 'react-native-flash-message';

export function showErrorMessage(message: string = 'Something went wrong ') {
  showMessage({
    message,
    type: 'danger',
    duration: 4000,
  });
}
