import OBR from '@owlbear-rodeo/sdk';
import { Tool } from './Tool';
import { grid } from '@davidsev/owlbear-utils';

window.init = function () {
    OBR.onReady(async () => {
        await grid.awaitReady();
        OBR.tool.createMode(new Tool());
    });
};
