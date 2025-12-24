import { UiNode, UiNodeImageAttributes } from '@ory/client';

interface Props {
    node: UiNode;
    attributes: UiNodeImageAttributes;
}

export const NodeImage = ({ node, attributes }: Props) => {
    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={attributes.src}
            width={200}
            alt={node.meta.label?.text}
        />
    );
};
