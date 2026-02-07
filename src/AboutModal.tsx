import { useModalRef } from "./misc/useModalRef";

import cannonKeys from "./assets/cannonkeys.png";
import cannonKeysDarkMode from "./assets/cannonkeys-dark-mode.png";

import niceAndTyperactive from "./assets/niceandtyperactive.png";
import niceAndTyperactiveDarkMode from "./assets/niceandtyperactive-dark-mode.png";

import kinesis from "./assets/kinesis.png";
import kinesisDarkMode from "./assets/kinesis-dark-mode.png";

import keychron from "./assets/keychron.png";
import keychronDarkMode from "./assets/keychron-dark-mode.png";

import littleKeyboards from "./assets/littlekeyboards.avif";
import littleKeyboardsDarkMode from "./assets/littlekeyboards-dark-mode.avif";

import keebmaker from "./assets/keebmaker.png";
import keebmakerDarkMode from "./assets/keebmaker-dark-mode.png";

import keebio from "./assets/keebio.avif";

import deskHero from "./assets/deskhero.webp";
import deskHeroDarkMode from "./assets/deskhero-dark-mode.webp";

import mode from "./assets/mode.png";
import modeDarkMode from "./assets/mode-dark-mode.png";

import mechlovin from "./assets/mechloving.png";
import mechlovinDarkMode from "./assets/mechlovin-dark-mode.png";

import phaseByte from "./assets/phasebyte.png";

import keycapsss from "./assets/keycapsss.png";
import keycapsssDarkMode from "./assets/keycapsss-dark-mode.png";

import mekibo from "./assets/mekibo.png";
import mekiboDarkMode from "./assets/mekibo-dark-mode.png";

import splitkb from "./assets/splitkb.png";
import splitkbDarkMode from "./assets/splitkb-dark-mode.png";
import { GenericModal } from "./GenericModal";
import { ExternalLink } from "./misc/ExternalLink";
import { useTranslation } from "react-i18next";

export interface AboutModalProps {
  open: boolean;
  onClose: () => void;
}

enum SponsorSize {
  Large,
  Medium,
  Small,
}

const sponsors = [
  {
    level: "Platinum",
    size: SponsorSize.Large,
    vendors: [
      {
        name: "nice!keyboards / typeractive",
        img: niceAndTyperactive,
        darkModeImg: niceAndTyperactiveDarkMode,
        url: "https://typeractive.xyz/",
      },
      {
        name: "Kinesis",
        img: kinesis,
        darkModeImg: kinesisDarkMode,
        url: "https://kinesis-ergo.com/",
      },
    ],
  },
  {
    level: "Gold+",
    size: SponsorSize.Large,
    vendors: [
      {
        name: "CannonKeys",
        img: cannonKeys,
        darkModeImg: cannonKeysDarkMode,
        url: "https://cannonkeys.com/",
      },
      {
        name: "Keychron",
        img: keychron,
        darkModeImg: keychronDarkMode,
        url: "https://keychron.com/",
      },
    ],
  },
  {
    level: "Gold",
    size: SponsorSize.Medium,
    vendors: [
      {
        name: "Little Keyboards",
        img: littleKeyboards,
        darkModeImg: littleKeyboardsDarkMode,
        url: "https://littlekeyboards.com/",
      },
      {
        name: "Keebmaker",
        img: keebmaker,
        darkModeImg: keebmakerDarkMode,
        url: "https://keebmaker.com/",
      },
    ],
  },
  {
    level: "Silver",
    size: SponsorSize.Medium,
    vendors: [
      {
        name: "keeb.io",
        img: keebio,
        url: "https://keeb.io/",
      },
      {
        name: "Mode Designs",
        img: mode,
        darkModeImg: modeDarkMode,
        url: "https://modedesigns.com/",
      },
    ],
  },
  {
    level: "Bronze",
    size: SponsorSize.Small,
    vendors: [
      {
        name: "deskhero",
        img: deskHero,
        darkModeImg: deskHeroDarkMode,
        url: "https://deskhero.ca/",
      },
      {
        name: "PhaseByte",
        img: phaseByte,
        url: "https://phasebyte.com/",
      },
      {
        name: "Mechlovin'",
        img: mechlovin,
        darkModeImg: mechlovinDarkMode,
        url: "https://mechlovin.studio/",
      },
    ],
  },
  {
    level: "Additional",
    size: SponsorSize.Small,
    vendors: [
      {
        name: "splitkb.com",
        img: splitkb,
        darkModeImg: splitkbDarkMode,
        url: "https://splitkb.com/",
      },
      {
        name: "keycapsss",
        img: keycapsss,
        darkModeImg: keycapsssDarkMode,
        url: "https://keycapsss.com/",
      },
      {
        name: "mekibo",
        img: mekibo,
        darkModeImg: mekiboDarkMode,
        url: "https://mekibo.com/",
      },
    ],
  },
];

export const AboutModal = ({ open, onClose }: AboutModalProps) => {
  const ref = useModalRef(open, true);
  const { t } = useTranslation();

  return (
    <GenericModal ref={ref} className="w-[600px] max-w-[90vw] p-0 overflow-hidden bg-base-100 rounded-3xl shadow-2xl" onClose={onClose}>

      {/* Header */}
      <div className="px-6 py-4 border-b border-base-content/5 flex items-center justify-between bg-base-100 sticky top-0 z-10">
        <h2 className="text-xl font-black tracking-tight text-base-content">
          {t("settings.about")}
        </h2>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-base-content/10 transition-colors text-base-content/60 hover:text-base-content outline-none"
          aria-label={t("common.close")}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div className="p-6 overflow-y-auto max-h-[70vh] space-y-8 custom-scrollbar">

        {/* Project Info Section */}
        <div className="space-y-4">
          <p className="text-sm font-medium text-base-content/70 leading-relaxed">
            {t("about.project")}
          </p>
          <div className="flex flex-wrap gap-2">
            <ExternalLink href="https://zmk.dev/" className="px-4 py-2 rounded-xl bg-base-200 hover:bg-primary/10 hover:text-primary transition-colors text-sm font-bold flex items-center gap-2 no-underline">
              {t("about.website")}
            </ExternalLink>
            <ExternalLink href="https://github.com/zmkfirmware/zmk/issues/" className="px-4 py-2 rounded-xl bg-base-200 hover:bg-primary/10 hover:text-primary transition-colors text-sm font-bold flex items-center gap-2 no-underline">
              {t("about.issues")}
            </ExternalLink>
            <ExternalLink href="https://zmk.dev/community/discord/invite" className="px-4 py-2 rounded-xl bg-base-200 hover:bg-primary/10 hover:text-primary transition-colors text-sm font-bold flex items-center gap-2 no-underline">
              {t("about.discord")}
            </ExternalLink>
          </div>
        </div>

        {/* Sponsors Section */}
        <div className="space-y-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-bold text-base-content">{t("about.sponsors", "Sponsors")}</h3>
            <p className="text-xs text-base-content/50">
              ZMK Studio is made possible thanks to the generous donation of time from our contributors and financial sponsorship from these vendors.
            </p>
          </div>

          <div className="flex flex-col gap-6">
            {sponsors.map((s) => {
              const heightVariants = {
                [SponsorSize.Large]: "h-12",
                [SponsorSize.Medium]: "h-10",
                [SponsorSize.Small]: "h-8",
              };

              return (
                <div key={s.level} className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary/80 bg-primary/10 px-2 py-1 rounded-md">
                      {s.level}
                    </span>
                    <div className="h-[1px] flex-1 bg-base-content/5"></div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {s.vendors.map((v) => {

                      return (
                        <a
                          key={v.name}
                          href={v.url}
                          target="_blank"
                          rel="noreferrer"
                          className="group p-4 bg-base-200/50 hover:bg-base-200 rounded-xl transition-all hover:shadow-sm border border-transparent hover:border-base-content/5 flex items-center justify-center grayscale hover:grayscale-0 opacity-70 hover:opacity-100"
                        >
                          <picture aria-label={v.name} className="w-full flex items-center justify-center">
                            {v.darkModeImg && (
                              <source
                                className={`${heightVariants[s.size]} w-auto object-contain transition-transform group-hover:scale-105`}
                                srcSet={v.darkModeImg}
                                media="(prefers-color-scheme: dark)"
                              />
                            )}
                            <img
                              className={`${heightVariants[s.size]} w-auto object-contain transition-transform group-hover:scale-105`}
                              src={v.img}
                              alt={v.name}
                            />
                          </picture>
                        </a>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </GenericModal>
  );
};
