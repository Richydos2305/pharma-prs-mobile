import { render, fireEvent, screen } from '@testing-library/react-native';
import { ActivityIndicator } from 'react-native';
import { Button } from '../../components/ui/Button';

describe('Button', () => {
  const onPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the title text', () => {
    render(<Button title="Submit" onPress={onPress} />);
    expect(screen.getByText('Submit')).toBeTruthy();
  });

  it('should call onPress when pressed', () => {
    render(<Button title="Submit" onPress={onPress} />);
    fireEvent.press(screen.getByText('Submit'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('should not call onPress when disabled is true', () => {
    render(<Button title="Submit" onPress={onPress} disabled />);
    fireEvent.press(screen.getByText('Submit'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('should not call onPress when loading is true', () => {
    render(<Button title="Submit" onPress={onPress} loading />);
    const indicator = screen.UNSAFE_getByType(ActivityIndicator);
    fireEvent.press(indicator);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('should show an ActivityIndicator when loading is true', () => {
    render(<Button title="Submit" onPress={onPress} loading />);
    expect(screen.UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it('should hide the title text when loading is true', () => {
    render(<Button title="Submit" onPress={onPress} loading />);
    expect(screen.queryByText('Submit')).toBeNull();
  });
});
