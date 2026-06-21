import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

describe('minimal', () => {
  it('renders text', () => {
    render(<Text>Hello</Text>);
    expect(screen.getByText('Hello')).toBeTruthy();
  });
});
