import { AvatarMenu } from './AvatarMenu';

export function Topbar() {
  return (
    <header className="topbar">
      <div className="topbar-logo">
        <img src="/fullfront-logo.webp" alt="Fullfront" className="logo-img" />
        <div className="logo-divider" />
        <span className="logo-sub">Webtekst Assistent</span>
      </div>
      <div className="topbar-right">
        <AvatarMenu />
      </div>
    </header>
  );
}
