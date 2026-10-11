// bisiyata dishmaya, leharbot ahava biyisral
import { IconButton } from '@/ui/IconButton';
import { PersonIcon } from '@/ui/icons';

export function AppHeader() {
  return (
    <header className="app-header">
      <a className="brand" href="#/">
        <h1>Saprili</h1>
        <p>Your storybook scribe</p>
      </a>
      <IconButton
        icon={<PersonIcon />}
        label="My settings"
        onClick={() => {
          window.location.hash = '#/settings';
        }}
      />
    </header>
  );
}
