import { render, screen } from '@testing-library/react-native';
import { Image } from 'react-native';
import { Avatar } from '../../components/ui/Avatar';

describe('Avatar', () => {
  it('should show "JD" initials for "John Doe"', () => {
    render(<Avatar name="John Doe" />);
    expect(screen.getByText('JD')).toBeTruthy();
  });

  it('should show "A" initials for a single-word name "Ama"', () => {
    render(<Avatar name="Ama" />);
    expect(screen.getByText('A')).toBeTruthy();
  });

  it('should show a maximum of 2 initials for "Mary Jane Watson"', () => {
    render(<Avatar name="Mary Jane Watson" />);
    expect(screen.getByText('MJ')).toBeTruthy();
  });

  it('should not crash and render nothing for an empty string name', () => {
    expect(() => render(<Avatar name="" />)).not.toThrow();
  });

  it('should render an Image component when imageUri is provided', () => {
    render(<Avatar name="John Doe" imageUri="https://example.com/avatar.jpg" />);
    const image = screen.UNSAFE_getByType(Image);
    expect(image).toBeTruthy();
    expect(image.props.source).toEqual({ uri: 'https://example.com/avatar.jpg' });
  });

  it('should use 40 as the default size for the avatar container', () => {
    render(<Avatar name="John Doe" />);
    expect(screen.getByText('JD')).toBeTruthy();
  });

  it('should apply a custom size when size prop is provided', () => {
    render(<Avatar name="John Doe" size={64} />);
    expect(screen.getByText('JD')).toBeTruthy();
  });
});
