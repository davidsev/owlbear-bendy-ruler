import OBR from '@owlbear-rodeo/sdk';
import { Tool } from './Tool';
import { grid } from './SyncGridData';

(window as any).init = function () {
    OBR.onReady(async () => {
        await grid.init();
        OBR.tool.createMode(new Tool());
    });
};
