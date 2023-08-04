import { KeyEvent, ToolIcon, ToolMode } from '@owlbear-rodeo/sdk';
import getId from './getId';
import { ToolContext, ToolEvent } from '@owlbear-rodeo/sdk/lib/types/Tool';
import { BendyRuler } from './BendyRuler';

export class Tool implements ToolMode {

    readonly id = getId('tool');

    private ruler?: BendyRuler;

    /** The icon that will be displayed in the toolbar. */
    get icons (): ToolIcon[] {
        return [{
            icon: '/icon.svg',
            label: 'Bendy Ruler',
            filter: {
                activeTools: ['rodeo.owlbear.tool/measure'],
            },
        }];
    }

    async onToolClick (context: ToolContext, event: ToolEvent): Promise<boolean> {
        const point = event.pointerPosition;

        if (!this.ruler) {
            this.ruler = new BendyRuler(point);
        } else {
            this.ruler.addPoint(point);
        }

        return false;
    }

    onToolMove (context: ToolContext, event: ToolEvent): void {
        if (!this.ruler)
            return;

        const point = event.pointerPosition;
        this.ruler.update(point);
    }

    onToolDoubleClick (context: ToolContext, event: ToolEvent): boolean {

        if (this.ruler) {
            const point = event.pointerPosition;
            this.ruler.finalise(point);
            this.ruler = undefined;
        }

        return false;
    }

    onDeactivate (context: ToolContext) {
        this.ruler?.cancel();
        this.ruler = undefined;
    }

    onKeyDown (context: ToolContext, event: KeyEvent) {
        if (event.key === 'Escape') {
            this.ruler?.cancel();
            this.ruler = undefined;
        }
    }
}
