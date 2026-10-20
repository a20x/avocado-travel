import Image from 'next/image';
import type { Airline } from '../model';

type AirlineLogoProps = {
  airline: Pick<Airline, 'logo' | 'name'>;
  size?: number;
  /** Рядом уже написано название — тогда логотип декоративный и диктор его пропускает. */
  decorative?: boolean;
};

/** Логотип авиакомпании из public/images/airlines. */
export function AirlineLogo({ airline, size = 40, decorative = true }: AirlineLogoProps) {
  return (
    <Image
      src={airline.logo}
      alt={decorative ? '' : airline.name}
      width={size}
      height={size}
      className="shrink-0 rounded-sm"
    />
  );
}
