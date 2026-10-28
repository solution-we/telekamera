import Link from "next/link";
import { PageShell } from "@/components/site";
import { ProductPreview } from "@/components/product-preview";
import { DownloadAction, ReleaseCard } from "@/components/downloads";
import { Icon } from "@/components/icon";
import { getLatestStableRelease } from "@/lib/releases";

export const dynamic = "force-dynamic";
export const metadata = { alternates: { canonical: "/" } };

const features = [
  { icon: "usb", title: "USB connection", body: "Connect your phone and PC with a cable when that option is available in your app build." },
  { icon: "wifi", title: "Local Wi-Fi", body: "Pair over your local network when supported by the installed TeleKamera apps." },
  { icon: "camera", title: "Phone camera, on PC", body: "Bring the camera you already carry into your desk setup." },
  { icon: "settings", title: "Straightforward setup", body: "A companion app on each device keeps the process easy to follow." },
];

export default async function HomePage() {
  const [android, windows] = await Promise.all([getLatestStableRelease("android"), getLatestStableRelease("windows")]);
  return <PageShell>
    <section className="heroSection"><div className="container heroGrid">
      <div className="heroCopy"><span className="eyebrow"><i/> ANDROID + WINDOWS</span><h1>Your pocket<br/><em>studio.</em></h1><p>Turn your Android phone into a webcam for your PC with TeleKamera.</p>
        <div className="heroActions"><div className="downloadCta"><span className="ctaPlatform"><Icon name="phone"/><span><b>Android</b><small>{android ? `v${android.version} · APK` : "Release coming soon"}</small></span></span><DownloadAction platform="android" release={android} label="Download"/></div>
          <div className="downloadCta"><span className="ctaPlatform"><Icon name="monitor"/><span><b>Windows</b><small>{windows ? `v${windows.version} · Installer` : "Release coming soon"}</small></span></span><DownloadAction platform="windows" release={windows} label="Download"/></div></div>
        <div className="heroProof"><span><Icon name="check" size={15}/> USB + local Wi-Fi*</span><span><Icon name="check" size={15}/> Android phone + PC</span><span><Icon name="check" size={15}/> Release details up front</span></div>
        <small className="heroFootnote">*Connection methods depend on the supported options in the installed releases.</small>
      </div><div className="heroVisual"><ProductPreview/></div>
    </div><div className="heroGlow" aria-hidden="true"/></section>

    <section className="featureStrip container" id="features" aria-label="TeleKamera highlights">{features.map((feature) => <article className="featureTile" key={feature.title}><span className="featureIcon"><Icon name={feature.icon} size={24}/></span><h3>{feature.title}</h3><p>{feature.body}</p></article>)}</section>

    <section className="section container howSection" id="how-it-works"><div className="sectionHeading"><div><span className="eyebrow">HOW IT WORKS</span><h2>Get set up in three steps.</h2><p>Bring your phone camera into your PC setup with the companion apps.</p></div><Link className="textLink" href="/downloads">Browse releases <Icon name="arrow" size={16}/></Link></div>
      <div className="stepsGrid"><article className="stepCard"><span className="stepNumber">01</span><span className="stepIcon"><Icon name="phone" size={25}/></span><div><h3>Install on Android</h3><p>Download the TeleKamera app for your phone.</p></div></article><article className="stepCard"><span className="stepNumber">02</span><span className="stepIcon"><Icon name="usb" size={25}/></span><div><h3>Install on your PC</h3><p>Get the Windows companion, then connect using an option supported by both apps.</p></div></article><article className="stepCard"><span className="stepNumber">03</span><span className="stepIcon"><Icon name="monitor" size={25}/></span><div><h3>Follow the app</h3><p>Open TeleKamera and follow its connection and camera instructions.</p></div></article></div>
    </section>

    <section className="section container gallerySection" id="screenshots"><div className="galleryFrame"><div className="sectionHeading galleryHeading"><div><span className="eyebrow">PRODUCT PREVIEW</span><h2>Clear. Calm. Considered.</h2><p>Interface concepts for the Android app and Windows companion.</p></div><span className="placeholderLabel">DESIGN PLACEHOLDER</span></div><ProductPreview variant="gallery"/></div></section>

    <section className="section container latestSection" id="downloads"><div className="sectionHeading"><div><span className="eyebrow">LATEST STABLE RELEASES</span><h2>Downloads, when you need them.</h2><p>Published versions and file details, sourced from the release archive.</p></div><Link className="textLink" href="/downloads">All releases <Icon name="arrow" size={16}/></Link></div>
      <div className="latestGrid">{android ? <ReleaseCard release={android} featured/> : <div className="comingCard"><span className="platformMark"><Icon name="phone"/></span><span className="channelPill">ANDROID</span><h3>Android release</h3><p>The first published stable APK will appear here.</p><button className="button buttonDisabled" disabled>Coming soon</button></div>}
        {windows ? <ReleaseCard release={windows} featured/> : <div className="comingCard"><span className="platformMark"><Icon name="monitor"/></span><span className="channelPill">WINDOWS</span><h3>Windows release</h3><p>The first published stable installer will appear here.</p><button className="button buttonDisabled" disabled>Coming soon</button></div>}</div>
    </section>

    <section className="section container faqSection" id="faq"><div className="faqIntro"><span className="eyebrow">GOOD TO KNOW</span><h2>Questions, answered.</h2><p>Start with the current release notes and setup guidance for the version you install.</p></div><div className="faqList"><details><summary>What do I need to get started?<span>+</span></summary><p>An Android phone and the TeleKamera apps for Android and Windows. Follow the instructions in the installed apps to connect them.</p></details><details><summary>Can I use it with every video calling app?<span>+</span></summary><p>Compatibility depends on the installed TeleKamera version and the other app. Check the release notes and setup guide for the current details.</p></details><details><summary>Which connection methods are available?<span>+</span></summary><p>USB and local Wi-Fi are shown in the product reference. Availability depends on the current Android and Windows releases.</p></details></div></section>

    <section className="bottomCta container"><div><span className="eyebrow">YOUR NEXT SETUP</span><h2>Ready when you are.</h2><p>Check the release archive for the current Android and Windows downloads.</p></div><Link className="button buttonPrimary" href="/downloads">Explore downloads <Icon name="arrow" size={16}/></Link></section>
  </PageShell>;
}
