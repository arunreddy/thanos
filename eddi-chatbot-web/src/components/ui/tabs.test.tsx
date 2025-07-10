import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect } from 'vitest';
import '@testing-library/jest-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';


describe('Tabs Component', () => {
  test('renders Tabs, TabsList, TabsTrigger, and TabsContent', () => {
    render(
      <Tabs defaultValue="tab1" data-testid="tabs-root">
        <TabsList data-testid="tabs-list">
          <TabsTrigger value="tab1" data-testid="tab-trigger-1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2" data-testid="tab-trigger-2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1" data-testid="tab-content-1">Content 1</TabsContent>
        <TabsContent value="tab2" data-testid="tab-content-2">Content 2</TabsContent>
      </Tabs>
    );

    expect(screen.getByTestId('tabs-root')).toBeInTheDocument();
    expect(screen.getByTestId('tabs-list')).toBeInTheDocument();
    expect(screen.getByTestId('tab-trigger-1')).toBeInTheDocument();
    expect(screen.getByTestId('tab-trigger-2')).toBeInTheDocument();
    expect(screen.getByTestId('tab-content-1')).toBeInTheDocument();
    expect(screen.getByTestId('tab-content-2')).toBeInTheDocument();
  });

  test('shows correct content when tab is selected', async () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>
    );

    expect(screen.getByText('Content 1')).toBeVisible();

    await userEvent.click(screen.getByText('Tab 2'));
    expect(screen.getByText('Content 2')).toBeVisible();
  });

  test('applies custom className to Tabs and children', () => {
    render(
      <Tabs className="custom-tabs">
        <TabsList className="custom-list">
          <TabsTrigger value="tab1" className="custom-trigger">Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1" className="custom-content">Content 1</TabsContent>
      </Tabs>
    );
    expect(screen.getByText('Tab 1').parentElement).toHaveClass('custom-list');
    expect(screen.getByText('Tab 1')).toHaveClass('custom-trigger');
  });
});
