import { MobileShell } from "./MobileShell";
import { DesktopShell } from "./DesktopShell";

export function ResponsiveLayout() {
  return (
    <>
      {/* Mobile layout (default) */}
      <div className="md:hidden h-full">
        <MobileShell />
      </div>

      {/* Desktop layout */}
      <DesktopShell />
    </>
  );
}
