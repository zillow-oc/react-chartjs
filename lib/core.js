var React = require('react');
var ReactDOM = require('react-dom');

module.exports = {
  createClass: function(chartType, methodNames, dataKey) {
    var classData = {
      displayName: chartType + 'Chart',
      getInitialState: function() { return {}; },
      render: function() {
        var _props = {
          ref: 'canvass'
        };
        for (var name in this.props) {
          if (this.props.hasOwnProperty(name)) {
            if (name !== 'data' && name !== 'options') {
              _props[name] = this.props[name];
            }
          }
        }
        return React.createElement('canvas', _props);
      }
    };

    var extras = ['clear', 'stop', 'resize', 'toBase64Image', 'generateLegend', 'update', 'addData', 'removeData'];
    function extra(type) {
      classData[type] = function() {
        return this.state.chart[type].apply(this.state.chart, arguments);
      };
    }

    classData.componentDidMount = function() {
      this.initializeChart(this.props);
    };

    classData.componentWillUnmount = function() {
      var chart = this.state.chart;
      chart.destroy();
    };

    classData.componentWillReceiveProps = function(nextProps) {
      var chart = this.state.chart;
      if (nextProps.redraw) {
        chart.destroy();
        this.initializeChart(nextProps);
      } else {
        dataKey = dataKey || dataKeys[chart.name];
        updatePoints(nextProps, chart, dataKey);
        if (chart.scale) {
          chart.scale.xLabels = nextProps.data.labels;
          chart.scale.calculateXLabelRotation();
        }
        chart.update();
      }
    };

    classData.initializeChart = function(nextProps) {
      var Chart = require('chart.js');
      var el = ReactDOM.findDOMNode(this);
      var ctx = el.getContext("2d");
      Chart.types.Doughnut.extend({
        name: "DoughnutInnerText",
        showTooltip: function () {
          this.chart.ctx.save();
          Chart.types.Doughnut.prototype.showTooltip.apply(this, arguments);
          this.chart.ctx.restore();
        },
        draw: function () {
          Chart.types.Doughnut.prototype.draw.apply(this, chart, arguments);
          var labels = nextProps.options.labels || [];
          var _this = this;
          labels.map(function (label, i) {
            _this.chart.ctx.font = label.font;
            _this.chart.ctx.fillStyle = label.fillStyle || '#000';
            _this.chart.ctx.textBaseline = label.textBaseline || 'middle';
            var text = label.value || '';
            var textX = label.x || Math.round((_this.chart.width - _this.chart.ctx.measureText(text).width) / 2);
            var textY = label.y || (_this.chart.height / 2.25) + (i * 40);
            _this.chart.ctx.fillText(text, textX, textY);
          });
        }
      });
      var chart = new Chart(ctx)[chartType](nextProps.data, nextProps.options || {});
      this.state.chart = chart;
    };

    // return the chartjs instance
    classData.getChart = function() {
      return this.state.chart;
    };

    // return the canvass element that contains the chart
    classData.getCanvass = function() {
      return this.refs.canvass;
    };

    classData.getCanvas = classData.getCanvass;

    var i;
    for (i=0; i<extras.length; i++) {
      extra(extras[i]);
    }
    for (i=0; i<methodNames.length; i++) {
      extra(methodNames[i]);
    }

    return React.createClass(classData);
  }
};

var dataKeys = {
  'Line': 'points',
  'Radar': 'points',
  'Bar': 'bars'
};

var updatePoints = function(nextProps, chart, dataKey) {
  var name = chart.name;

  if (name === 'PolarArea' || name === 'Pie' || name === 'Doughnut' || name === 'DoughnutInnerText') {
    nextProps.data.forEach(function(segment, segmentIndex) {
      if (!chart.segments[segmentIndex]) {
        chart.addData(segment);
      } else {
        Object.keys(segment).forEach(function (key) {
          chart.segments[segmentIndex][key] = segment[key];
        });
      }
    });
  } else {
    while (chart.scale.xLabels.length > nextProps.data.labels.length) {
      chart.removeData();
    }
    nextProps.data.datasets.forEach(function(set, setIndex) {
      set.data.forEach(function(val, pointIndex) {
        if (typeof(chart.datasets[setIndex][dataKey][pointIndex]) == "undefined") {
          addData(nextProps, chart, setIndex, pointIndex);
        } else {
          chart.datasets[setIndex][dataKey][pointIndex].value = val;
        }
      });
    });
  }
};

var addData = function(nextProps, chart, setIndex, pointIndex) {
  var values = [];
  nextProps.data.datasets.forEach(function(set) {
    values.push(set.data[pointIndex]);
  });
  chart.addData(values, nextProps.data.labels[setIndex]);
};
