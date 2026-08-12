import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createSupabaseFake } from '../lib/__fixtures__/supabase-fake';

const mock = createSupabaseFake();
vi.mock('../lib/supabase/client', () => ({ supabase: mock.supabase }));

const { QRMenuProvider } = await import('../lib/store');
const { default: AdminProfile } = await import('./AdminProfile');

const renderProfile = () => {
  render(
    <QRMenuProvider>
      <AdminProfile onBack={() => {}} />
    </QRMenuProvider>
  );
};

beforeEach(() => {
  mock.reset();
});

afterEach(() => {
  cleanup();
});

describe('AdminProfile — change password', () => {
  it('prompts for login when there is no owner session', () => {
    renderProfile();
    expect(screen.getByText(/Увійдіть у кабінет власника/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Новий пароль')).not.toBeInTheDocument();
  });

  it('shows an error when passwords do not match', async () => {
    const user = userEvent.setup();
    mock.state.session = { user: { email: 'owner@cafe.com' } };
    renderProfile();

    await screen.findByLabelText('Новий пароль');
    await user.type(screen.getByLabelText('Новий пароль'), 'password-123');
    await user.type(screen.getByLabelText('Підтвердіть пароль'), 'different-456');
    await user.click(screen.getByRole('button', { name: 'Змінити пароль' }));

    expect(await screen.findByText('Паролі не збігаються.')).toBeInTheDocument();
  });

  it('changes the password successfully', async () => {
    const user = userEvent.setup();
    mock.state.session = { user: { email: 'owner@cafe.com' } };
    renderProfile();

    await screen.findByLabelText('Новий пароль');
    await user.type(screen.getByLabelText('Новий пароль'), 'new-secure-password');
    await user.type(screen.getByLabelText('Підтвердіть пароль'), 'new-secure-password');
    await user.click(screen.getByRole('button', { name: 'Змінити пароль' }));

    expect(await screen.findByText('Пароль успішно змінено.')).toBeInTheDocument();
  });
});
