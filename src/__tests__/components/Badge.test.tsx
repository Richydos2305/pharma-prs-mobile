import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { Badge } from '../../components/ui/Badge';

describe('Badge', () => {
  it('should render the label text', () => {
    render(<Badge label="Active" />);
    expect(screen.getByText('Active')).toBeTruthy();
  });

  it('should render with default variant when no variant is specified', () => {
    render(<Badge label="Status" />);
    expect(screen.getByText('Status')).toBeTruthy();
  });

  it('should render the success variant', () => {
    render(<Badge label="Verified" variant="success" />);
    expect(screen.getByText('Verified')).toBeTruthy();
  });

  it('should render the warning variant', () => {
    render(<Badge label="Pending" variant="warning" />);
    expect(screen.getByText('Pending')).toBeTruthy();
  });

  it('should render the error variant', () => {
    render(<Badge label="Rejected" variant="error" />);
    expect(screen.getByText('Rejected')).toBeTruthy();
  });

  it('should render the accent variant', () => {
    render(<Badge label="New" variant="accent" />);
    expect(screen.getByText('New')).toBeTruthy();
  });

  it('should apply green background (#DCFCE7) for the success variant', () => {
    render(<Badge label="Verified" variant="success" />);
    // getByText returns the inner text node; parent is <Text>, parent.parent is the container <View>
    const textEl = screen.getByText('Verified');
    const containerStyle = textEl.parent?.parent?.props.style;
    const flatStyle = StyleSheet.flatten(containerStyle);
    expect(flatStyle?.backgroundColor).toBe('#DCFCE7');
  });
});
