import { useAppUpdate } from '../lib/pwaHooks'

export default function UpdatePrompt() {
  const { updateAvailable, applyUpdate } = useAppUpdate();

  if (!updateAvailable) {
    return null;
  }

  return (
    <div className="update-prompt">
      <div className="update-content">
        <span className="update-icon">🎉</span>
        <span className="update-text">A new version is available!</span>
        <button className="update-btn" onClick={applyUpdate}>
          Update Now
        </button>
        <button className="update-dismiss" onClick={() => window.dispatchEvent(new Event('swUpdateDismissed'))}>
          Later
        </button>
      </div>
    </div>
  );
}
