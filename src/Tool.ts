import OBR, { buildLabel, InteractionManager, KeyEvent, Label, ToolIcon, ToolMode, Vector2 } from '@owlbear-rodeo/sdk';
import getId from './getId';
import { ToolContext, ToolEvent } from '@owlbear-rodeo/sdk/lib/types/Tool';
import { BendyRuler } from './BendyRuler';
import { grid } from './SyncGridData';

export class Tool implements ToolMode {

    readonly id = getId('tool');

    private ruler?: BendyRuler;

    private cancelButton?: Label;
    private keepButton?: Label;
    private interaction?: InteractionManager<[cancel: Label, keep: Label]>;

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

    private getRoundedPosition (point: Vector2): Vector2 {
        const dpi = grid.dpi;
        const halfDpi = { x: grid.dpi / 2, y: grid.dpi / 2 };
        return {
            x: Math.round((point.x + halfDpi.x) / dpi) * dpi - halfDpi.x,
            y: Math.round((point.y + halfDpi.y) / dpi) * dpi - halfDpi.y,
        };
    }

    async onToolClick (context: ToolContext, event: ToolEvent): Promise<boolean> {
        const point = this.getRoundedPosition(event.pointerPosition);

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
        if (!this.ruler)
            return;

        const point = this.getRoundedPosition(event.pointerPosition);
        this.ruler.update(point);
    }

    private stop (keep: boolean): void {
        if (keep)
            this.ruler?.finalise();
        else
            this.ruler?.cancel();
        this.ruler = undefined;

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
