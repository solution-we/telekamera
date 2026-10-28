import { Icon } from "@/components/icon";

export function ProductPreview({ variant = "hero" }: { variant?: "hero" | "gallery" }) {
  return <div className={`productPreview preview-${variant}`} aria-label="TeleKamera interface design placeholder">
    <div className="desktopMock">
      <div className="windowBar"><span className="appMark"><Icon name="camera" size={15}/></span><b>TeleKamera</b><div className="windowControls"><i/><i/><i/></div></div>
      <div className="desktopContent">
        <aside className="desktopSidebar"><span className="liveDot"/> Ready to connect<div className="settingsTitle">Camera settings</div><div className="settingRow"><span>Camera</span><b>Phone camera</b></div><div className="settingRow"><span>Connection</span><b>USB or local Wi-Fi</b></div><div className="settingRow"><span>Orientation</span><b>Portrait</b></div><button type="button" disabled>Start camera</button></aside>
        <section className="previewStage"><div className="stageBadge">Interface concept</div><div className="lensGraphic"><span/><i/><b/></div><div className="stageFooter"><span>Camera preview placeholder</span><span className="readyTag"><i/> Waiting for phone</span></div></section>
      </div>
      <div className="desktopStatus"><div><small>Device</small><b>Not connected</b></div><div><small>Video</small><b>See release details</b></div><div><small>App</small><b>TeleKamera</b></div></div>
    </div>
    <div className="phoneMock"><div className="phoneNotch"/><div className="phoneTop"><span>9:41</span><span>•••</span></div><div className="phoneBrand"><span className="appMark"><Icon name="camera" size={13}/></span><b>TeleKamera</b></div><div className="phoneState"><i/> Waiting for PC</div><div className="phoneCard"><small>Camera</small><b>Choose a camera</b><span>Use the controls available in your app</span></div><div className="phoneLens"><div className="lensGraphic"><span/><i/><b/></div></div><strong className="phoneTagline">Your pocket studio.</strong><div className="phoneAction"><Icon name="usb" size={16}/><span><b>Connect</b><small>Follow the setup guide</small></span><span>›</span></div><div className="phoneAction"><Icon name="settings" size={16}/><span><b>Settings</b><small>App interface concept</small></span><span>›</span></div><div className="phoneBottom"><span>Home</span><span>Settings</span></div></div>
    <span className="previewNote">Design placeholder · not an application screenshot</span>
  </div>;
}
