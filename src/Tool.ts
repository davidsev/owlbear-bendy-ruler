import OBR, { buildLabel, InteractionManager, KeyEvent, Label, ToolIcon, ToolMode } from '@owlbear-rodeo/sdk';
import getId from './getId';
import { ToolContext, ToolEvent } from '@owlbear-rodeo/sdk/lib/types/Tool';
import { BendyRuler } from './BendyRuler';
import { grid, SnapTo } from '@davidsev/owlbear-utils';

export class Tool implements ToolMode {

    public readonly id = getId('tool');
    public readonly shortcut = 'B';

    private ruler?: BendyRuler;

    private cancelButton?: Label;
    private keepButton?: Label;
    private interaction?: InteractionManager<[cancel: Label, keep: Label]>;
    private snapTo?: SnapTo;

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

        // If we haven't decided on edge/corner yet, do that.
        if (!this.snapTo) {
            if (grid.type == 'SQUARE') {
                this.snapTo = grid.getNearestSnapType(event.pointerPosition);
            } else
                this.snapTo = SnapTo.CENTER;
        }

        const point = grid.snapTo(event.pointerPosition, this.snapTo);

        // If we don't have a ruler, start one.
        if (!this.ruler) {
            this.ruler = new BendyRuler(point);
            this.cancelButton = buildLabel()
                .position({ x: point.x + 45, y: point.y - 40 })
                .layer('CONTROL')
                .plainText('🗑️')
                .pointerHeight(0)
                .build();
            this.keepButton = buildLabel()
                .position({ x: point.x - 45, y: point.y - 40 })
                .layer('CONTROL')
                .plainText('✅')
                .pointerHeight(0)
                .build();
            this.interaction = await OBR.interaction.startItemInteraction([this.cancelButton, this.keepButton]);
            return false;
        }

        // If we do have ruler, check if we are clicking on a button.
        if (this.cancelButton && event.target?.id === this.cancelButton.id) {
            this.stop(false);
            return false;
        }
        if (this.keepButton && event.target?.id === this.keepButton?.id) {
            this.stop(true);
            return false;
        }

        // Otherwise add a point, and update the buttons' position.
        this.ruler.addPoint(point);
        if (this.interaction) {
            const [update] = this.interaction;
            update((items) => {
                const [cancel, keep] = items;
                cancel.position = { x: point.x + 45, y: point.y - 40 };
                keep.position = { x: point.x - 45, y: point.y - 40 };
            });
        }

        return false;
    }

    onToolMove (context: ToolContext, event: ToolEvent): void {
        if (!this.ruler || !this.snapTo)
            return;

        const point = grid.snapTo(event.pointerPosition, this.snapTo);
        this.ruler.update(point);
    }

    private stop (keep: boolean): void {
        // Track the event.
        if (this.ruler && window._paq)
            window._paq.push(['trackEvent', 'ruler', keep ? 'keep' : 'cancel']);

        if (keep)
            this.ruler?.finalise();
        else
            this.ruler?.cancel();
        this.ruler = undefined;
        this.snapTo = undefined;

        if (this.interaction) {
            const [_, stop] = this.interaction;
            stop();
            this.interaction = undefined;
            this.keepButton = undefined;
            this.cancelButton = undefined;
        }
    }

    onDeactivate (context: ToolContext) {
        this.stop(false);
    }

    onKeyDown (context: ToolContext, event: KeyEvent) {
        if (event.key === 'Escape') {
            this.stop(false);
        }
    }
}
