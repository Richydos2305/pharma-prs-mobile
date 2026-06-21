import { render, fireEvent, screen } from '@testing-library/react-native';
import { Input } from '../../components/ui/Input';

describe('Input', () => {
  it('should render the label text when label prop is provided', () => {
    render(<Input label="Email address" />);
    expect(screen.getByText('Email address')).toBeTruthy();
  });

  it('should not render a label element when label prop is omitted', () => {
    render(<Input />);
    expect(screen.queryByText(/./)).toBeNull();
  });

  it('should render the error text when error prop is provided', () => {
    render(<Input error="This field is required" />);
    expect(screen.getByText('This field is required')).toBeTruthy();
  });

  it('should not render error text when error prop is omitted', () => {
    render(<Input />);
    expect(screen.queryByText(/error/i)).toBeNull();
  });

  it('should pass the placeholder prop to the TextInput', () => {
    render(<Input placeholder="Enter your email" />);
    expect(screen.getByPlaceholderText('Enter your email')).toBeTruthy();
  });

  it('should call onChangeText when text changes', () => {
    const onChangeText = jest.fn();
    render(<Input placeholder="Type here" onChangeText={onChangeText} />);
    fireEvent.changeText(screen.getByPlaceholderText('Type here'), 'hello');
    expect(onChangeText).toHaveBeenCalledTimes(1);
    expect(onChangeText).toHaveBeenCalledWith('hello');
  });
});
