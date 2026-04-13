import { ChefHat, Instagram, Linkedin, Twitter } from "lucide-react";
import { type SupportedLocale } from "@/shared/i18n/locale";
import { useLocale } from "@/shared/i18n/LocaleContext";
import { Button } from "./Button";
import { footerCopy } from "./footer.messages";

interface FooterProps {
  locale?: SupportedLocale;
}

export function Footer({ locale }: FooterProps) {
  const { locale: contextLocale } = useLocale();
  const copy = footerCopy[locale ?? contextLocale];

  return (
    <footer className="bg-white border-t border-gray-100 pt-20 pb-10 mt-auto">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 lg:grid-cols-12 gap-8 md:gap-12 lg:gap-8 mb-16">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-2 lg:col-span-4">
            <div className="text-3xl font-extrabold text-primary font-display tracking-tight flex items-center gap-2 mb-6">
              <span className="bg-primary text-white p-1 rounded-lg">
                <ChefHat className="w-5 h-5" />
              </span>
              Nutri.
            </div>
            <p className="text-gray-500 leading-relaxed mb-8 max-w-sm">
              {copy.brandDescription}
            </p>
            <div className="flex gap-4">
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-primary hover:text-white transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-primary hover:text-white transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-primary hover:text-white transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Links Columns */}
          <div className="col-span-1 lg:col-span-2 space-y-4">
            <h4 className="font-bold text-gray-900 font-display mb-4">
              {copy.product}
            </h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="/#how-it-works"
                  className="text-gray-500 hover:text-primary transition-colors"
                >
                  {copy.howItWorks}
                </a>
              </li>
              <li>
                <a
                  href="/#features"
                  className="text-gray-500 hover:text-primary transition-colors"
                >
                  {copy.features}
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-500 hover:text-primary transition-colors"
                >
                  {copy.pricing}
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-500 hover:text-primary transition-colors"
                >
                  {copy.dietarySupported}
                </a>
              </li>
            </ul>
          </div>

          <div className="col-span-1 lg:col-span-2 space-y-4">
            <h4 className="font-bold text-gray-900 font-display mb-4">
              {copy.company}
            </h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="#"
                  className="text-gray-500 hover:text-primary transition-colors"
                >
                  {copy.aboutUs}
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-500 hover:text-primary transition-colors"
                >
                  {copy.careers}
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-500 hover:text-primary transition-colors"
                >
                  {copy.blog}
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-500 hover:text-primary transition-colors"
                >
                  {copy.press}
                </a>
              </li>
            </ul>
          </div>

          {/* Newsletter Column */}
          <div className="col-span-2 lg:col-span-4 mt-2 lg:mt-0">
            <h4 className="font-bold text-gray-900 font-display mb-4">
              {copy.newsletterTitle}
            </h4>
            <p className="text-gray-500 mb-4">
              {copy.newsletterDescription}
            </p>
            <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder={copy.emailPlaceholder}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all bg-gray-50"
                required
              />
              <Button type="submit" className="rounded-xl px-6">
                {copy.subscribe}
              </Button>
            </form>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
          <div className="text-gray-400 text-sm font-medium">
            {copy.copyright}
          </div>
          <div className="flex flex-wrap justify-center md:justify-end gap-x-6 gap-y-3 text-sm text-gray-500 font-medium w-full md:w-auto">
            <a href="#" className="hover:text-primary transition-colors">
              {copy.privacyPolicy}
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              {copy.termsOfService}
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              {copy.cookieSettings}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
