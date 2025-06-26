import { render, screen, fireEvent, configure } from "@testing-library/react";
import { describe, test, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from './dialog';

configure({
  testIdAttribute: 'data-slot'
});

// Mock the cn utility function
vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' ')
}));

describe('Dialog Components', () => {
  const renderDialog = () => {
    return render(
      <Dialog>
        <DialogTrigger>Open Dialog</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dialog Title</DialogTitle>
            <DialogDescription>Dialog Description</DialogDescription>
          </DialogHeader>
          <div>Content</div>
          <DialogFooter>
            <DialogClose>Close</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  test('renders dialog trigger with correct attributes', () => {
    renderDialog();
    const trigger = screen.getByText('Open Dialog');
    expect(trigger).toHaveAttribute('data-slot', 'dialog-trigger');
  });

  test('dialog content has correct base classes and attributes', () => {
    renderDialog();
    fireEvent.click(screen.getByText('Open Dialog'));
    const content = screen.getByRole('dialog');
    expect(content).toHaveAttribute('data-slot', 'dialog-content');
    expect(content).toHaveClass(
      'bg-background',
      'fixed',
      'top-[50%]',
      'left-[50%]',
      'z-50',
      'rounded-lg',
      'border'
    );
  });

  test('dialog header has correct layout classes', () => {
    renderDialog();
    fireEvent.click(screen.getByText('Open Dialog'));
    const header = screen.getByTestId('dialog-header');
    expect(header).toHaveAttribute('data-slot', 'dialog-header');
    expect(header).toHaveClass(
      'flex',
      'flex-col',
      'gap-2',
      'text-center',
      'sm:text-left'
    );
  });

  test('dialog title has correct styling', () => {
    renderDialog();
    fireEvent.click(screen.getByText('Open Dialog'));
    const title = screen.getByText('Dialog Title');
    expect(title).toHaveAttribute('data-slot', 'dialog-title');
    expect(title).toHaveClass('text-lg', 'leading-none', 'font-semibold');
  });

  test('dialog description has correct styling', () => {
    renderDialog();
    fireEvent.click(screen.getByText('Open Dialog'));
    const description = screen.getByText('Dialog Description');
    expect(description).toHaveAttribute('data-slot', 'dialog-description');
    expect(description).toHaveClass('text-muted-foreground', 'text-sm');
  });

  test('dialog footer has correct layout classes', () => {
    renderDialog();
    fireEvent.click(screen.getByText('Open Dialog'));
    const footer = screen.getByTestId('dialog-footer');
    expect(footer).toHaveAttribute('data-slot', 'dialog-footer');
    expect(footer).toHaveClass(
      'flex',
      'flex-col-reverse',
      'gap-2',
      'sm:flex-row',
      'sm:justify-end'
    );
  });

  test('close button has correct attributes and icon', () => {
    renderDialog();
    fireEvent.click(screen.getByText('Open Dialog'));
    const closeButton = screen.getByTestId('dialog-close');
    expect(closeButton).toHaveAttribute('data-slot', 'dialog-close');
  });

  test('applies additional className when provided', () => {
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent className="custom-content">
          <DialogHeader className="custom-header">
            <DialogTitle className="custom-title">Title</DialogTitle>
            <DialogDescription className="custom-desc">Desc</DialogDescription>
          </DialogHeader>
          <DialogFooter className="custom-footer">
            <DialogClose>Close</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );

    fireEvent.click(screen.getByText('Open'));

    const content = screen.getByRole('dialog');
    expect(content).toHaveClass('custom-content');

    const header = screen.getByTestId('dialog-header');
    expect(header).toHaveClass('custom-header');

    const title = screen.getByText('Title');
    expect(title).toHaveClass('custom-title');

    const desc = screen.getByText('Desc');
    expect(desc).toHaveClass('custom-desc');

    const footer = screen.getByTestId('dialog-footer');
    expect(footer).toHaveClass('custom-footer');
  });

  test('dialog overlay has correct styling', () => {
    renderDialog();
    fireEvent.click(screen.getByText('Open Dialog'));
    const overlay = screen.getByTestId('dialog-overlay');
    expect(overlay).toHaveAttribute('data-slot', 'dialog-overlay');
    expect(overlay).toHaveClass(
      'fixed',
      'inset-0',
      'z-50',
      'bg-black/50'
    );
  });

  test('forwards additional props to components', () => {
    render(
      <Dialog>
        <DialogTrigger data-testid="trigger">Open</DialogTrigger>
        <DialogContent data-testid="content">
          <DialogHeader data-testid="header">
            <DialogTitle data-testid="title">Title</DialogTitle>
            <DialogDescription data-testid="desc">Desc</DialogDescription>
          </DialogHeader>
          <DialogFooter data-testid="footer">
            <DialogClose data-testid="close">Close</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );

    expect(screen.getByTestId('dialog-trigger')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('dialog-trigger'));

    expect(screen.getByTestId('dialog-content')).toBeInTheDocument();
    expect(screen.getByTestId('dialog-header')).toBeInTheDocument();
    expect(screen.getByTestId('dialog-title')).toBeInTheDocument();
    expect(screen.getByTestId('dialog-description')).toBeInTheDocument();
    expect(screen.getByTestId('dialog-footer')).toBeInTheDocument();
    expect(screen.getByTestId('dialog-close')).toBeInTheDocument();
  });
});
