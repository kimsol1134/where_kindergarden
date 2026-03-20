declare module 'lucide-react/dist/esm/icons/*' {
  import { ForwardRefExoticComponent, RefAttributes, SVGProps } from 'react';

  type SVGAttributes = Partial<SVGProps<SVGSVGElement>>;
  type ElementAttributes = RefAttributes<SVGSVGElement> & SVGAttributes;
  interface LucideProps extends ElementAttributes {
    size?: string | number;
    absoluteStrokeWidth?: boolean;
  }

  const Icon: ForwardRefExoticComponent<
    Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>
  >;
  export default Icon;
}
