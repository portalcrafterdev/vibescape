import * as React from "react"
import Svg, { Path, SvgProps } from "react-native-svg"
// import * as React from "react"
// import Svg, { Path } from "react-native-svg"

function CircleDotIcon(props:SvgProps) {
  return (
    <Svg
      width={props.width}
      height={props.height}
      viewBox="0 0 24 24"
      fill="#000"
      // xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <Path
            d="M213.333 0c117.821 0 213.334 95.513 213.334 213.333 0 117.821-95.513 213.334-213.334 213.334C95.513 426.667 0 331.154 0 213.333 0 95.513 95.513 0 213.333 0m0 42.667c-94.256 0-170.666 76.41-170.666 170.666C42.667 307.59 119.077 384 213.333 384 307.59 384 384 307.59 384 213.333c0-94.256-76.41-170.666-170.667-170.666m0 64c58.91 0 106.667 47.756 106.667 106.666S272.244 320 213.333 320c-58.91 0-106.666-47.756-106.666-106.667 0-58.91 47.756-106.666 106.666-106.666"
        fill={props.color}
      />
    </Svg>
  )
}

// export default SvgComponent



export default CircleDotIcon;