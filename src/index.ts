import OBR from '@owlbear-rodeo/sdk';
import { Tool } from './Tool';

window.init = function () {
    OBR.onReady(async () => {
        OBR.tool.createMode(new Tool());
    });
};
