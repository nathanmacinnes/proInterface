module.exports = ProInterfacePresentation;
ProInterfacePresentation.ProInterfacePresentation = ProInterfacePresentation;

function ProInterfacePresentation(original) {
  var
    op = original.presentation,
    pip = this;
  this.title = op.presentationName;
  this.fileName = op.presentationCurrentLocation;
  pip.groups = [];
  pip.allSlides = [];
  op.groups.forEach(function (group) {
    var newGroup = {
      name : group.groupName,
      colour : group.groupColor,
      slides : []
    };
    pip.groups.push(newGroup);
    group.groupSlides.forEach(function (slide) {
      var newSlide = {
        group : newGroup,
        enabled : !!slide.enabled,
        text : slide.slideText,
        notes : slide.slideNotes
      };
      newGroup.slides.push(newSlide);
      pip.allSlides.push(newSlide);
    });
  });
}