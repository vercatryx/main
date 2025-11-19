import { Mail, Phone } from "lucide-react";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="bg-background text-muted-foreground py-12 px-4 sm:px-6 lg:px-8 border-t border-border transition-colors">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Image src="/logo-big.svg" alt="Vercatryx" width={100} height={100} />

            </div>
            <p className="text-muted-foreground text-lg leading-relaxed max-w-md">
              We take care of your repetitive work so you can focus on what really matters.
            </p>
          </div>
          
          <div>
            <h4 className="text-foreground mb-4 text-xl">Get In Touch</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-red-500" />
                <span className="text-lg">info@vercatryx.com</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-red-500" />
                <a href={"/contact"}>
                <span className="text-lg">Schedule a Call</span>
                  </a>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-border text-center text-muted-foreground">
          <p>&copy; 2025 vercatryx. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
