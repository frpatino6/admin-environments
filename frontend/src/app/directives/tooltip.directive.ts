import {
  Directive,
  ElementRef,
  HostListener,
  Input,
  OnDestroy,
  Renderer2,
  inject,
} from '@angular/core';

@Directive({
  selector: '[appTooltip]',
  standalone: true,
})
export class TooltipDirective implements OnDestroy {
  /** Tooltip text. Pass the full (non-truncated) value. */
  @Input('appTooltip') text = '';

  private el = inject(ElementRef<HTMLElement>);
  private renderer = inject(Renderer2);
  private tip: HTMLElement | null = null;

  @HostListener('mouseenter')
  show(): void {
    if (!this.text) return;
    const host = this.el.nativeElement;
    // Only materialise when text is actually overflowing
    if (host.scrollWidth <= host.offsetWidth) return;

    this.tip = this.renderer.createElement('div') as HTMLElement;
    this.tip.textContent = this.text;

    Object.assign(this.tip.style, {
      position: 'fixed',
      zIndex: '9999',
      background: 'rgba(8, 8, 28, 0.97)',
      color: '#c4b5fd',
      padding: '5px 10px',
      borderRadius: '8px',
      fontSize: '11px',
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      maxWidth: '300px',
      wordBreak: 'break-all',
      border: '1px solid rgba(139, 92, 246, 0.3)',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
      pointerEvents: 'none',
      lineHeight: '1.5',
    });

    document.body.appendChild(this.tip);
    this.reposition();
  }

  @HostListener('mouseleave')
  hide(): void {
    this.tip?.remove();
    this.tip = null;
  }

  ngOnDestroy(): void {
    this.hide();
  }

  private reposition(): void {
    if (!this.tip) return;
    const host = this.el.nativeElement.getBoundingClientRect();
    const tip = this.tip.getBoundingClientRect();

    let top = host.top - tip.height - 8;
    let left = host.left + host.width / 2 - tip.width / 2;

    // Flip below if no space above
    if (top < 8) top = host.bottom + 8;
    // Clamp horizontally
    left = Math.max(8, Math.min(left, window.innerWidth - tip.width - 8));

    this.tip.style.top = `${top}px`;
    this.tip.style.left = `${left}px`;
  }
}
